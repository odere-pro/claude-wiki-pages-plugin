/**
 * Firewall decision logic — the single authority for "may an agent write here?".
 *
 * The boundary is: writes are confined to the resolved vault, plus any
 * `firewall.allowPaths` roots, minus any `firewall.denyPaths` globs (which win
 * even inside an allowed root). The bash hook (`scripts/firewall.sh`) mirrors
 * this exactly; `tests/gates/gate-11-firewall-parity.sh` pins them together.
 *
 * Globs are deliberately simple (prefix + `*`/`**`) so the bash and TS matchers
 * stay in lock-step. `mode: warn` never blocks; `mode: off`/`enabled:false` is a
 * pass-through.
 *
 * Symlink safety (S3 / F1): the target and every boundary root are reduced to
 * their PHYSICAL paths (symlinks dereferenced) before any check, so a symlink
 * inside the active vault that points at a sibling cannot smuggle a write out.
 * `node:path resolve()` is lexical only and never derefs symlinks; the
 * `physicalPath` helper below adds that, mirrored byte-for-byte in
 * `scripts/firewall.sh`.
 */

import { resolve, dirname, basename, isAbsolute } from "node:path";
import { realpathSync, lstatSync, readlinkSync } from "node:fs";

export type FirewallMode = "enforce" | "warn" | "off";

export interface FirewallPolicy {
  readonly enabled: boolean;
  readonly mode: FirewallMode;
  /** Resolved vault directory (always implicitly allowed). */
  readonly vault: string;
  readonly allowPaths: readonly string[];
  readonly denyPaths: readonly string[];
  /**
   * Roots of OTHER registered vaults (all vaults[] paths minus the active one).
   * Writes to these are blocked as "cross-vault" — after denyPaths but before
   * the active vault and allowPaths checks.  allowPaths cannot override this.
   */
  readonly otherVaults: readonly string[];
}

export interface FirewallDecision {
  readonly allowed: boolean;
  /** Why the decision was reached, e.g. "vault", "deny:&lt;glob&gt;", "outside-vault". */
  readonly matchedRule: string;
  readonly mode: FirewallMode;
}

/**
 * Translate a simple glob (`*` within a segment, `**` across segments) to a
 * RegExp. Exported as the ONE glob dialect — backlog's wired-source filter
 * reuses it so no second dialect appears (bash twin: scripts/firewall.sh
 * glob_to_regex, pinned by gate-11).
 */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c as string)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

/** Does `p` exist on disk as a node (including a dangling symlink)? */
function lexists(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/** Is `p` a symbolic link (regardless of whether its target exists)? */
function isSymlink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Reduce a path to its PHYSICAL location: dereference symlinks (including a
 * dangling leaf and symlinked ancestors) while tolerating a non-existent tail
 * (the write target may be a new file). Mirrors `_realpath_physical` in
 * `scripts/firewall.sh`. When nothing on the path exists yet (e.g. a fictional
 * test root), this degrades to a lexical `resolve()`.
 */
function physicalPath(filePath: string): string {
  let target = resolve(filePath);
  const tail: string[] = [];
  // Walk up to the longest existing-or-symlink ancestor.
  while (target !== dirname(target) && !lexists(target)) {
    tail.unshift(basename(target));
    target = dirname(target);
  }
  // Iteratively dereference leaf symlinks (dangling allowed), peeling any newly
  // non-existent tail each round.
  // B04 parity: mirrors the named _SYMLINK_LOOP_MAX=40 constant in firewall.sh.
  // Linux MAXSYMLINKS is 40; we use the same ceiling in both twins.
  const SYMLINK_LOOP_MAX = 40;
  let guard = 0;
  while (guard < SYMLINK_LOOP_MAX && isSymlink(target)) {
    const link = readlinkSync(target);
    target = isAbsolute(link) ? link : resolve(dirname(target), link);
    guard++;
    while (target !== dirname(target) && !lexists(target)) {
      tail.unshift(basename(target));
      target = dirname(target);
    }
  }
  let phys: string;
  try {
    phys = realpathSync(target);
  } catch {
    phys = target;
  }
  return tail.length ? resolve(phys, ...tail) : phys;
}

/**
 * True when `path` is the directory `root` or sits underneath it. Both sides are
 * reduced to their physical location first, so a symlinked path cannot appear to
 * be under a root it does not physically belong to.
 */
function isUnder(path: string, root: string): boolean {
  const r = physicalPath(root);
  const p = physicalPath(path);
  return p === r || p.startsWith(r.endsWith("/") ? r : r + "/");
}

/** Match a path against an allow/deny entry: glob if it contains `*`, else a directory prefix. */
function matches(path: string, entry: string): boolean {
  const p = resolve(path);
  const phys = physicalPath(path);
  if (entry.includes("*")) {
    const re = globToRegExp(entry);
    // Test the lexical, resolved, and physical forms so a deny glob fires even
    // when the target reaches its physical location through a symlink.
    return re.test(p) || re.test(path) || re.test(phys);
  }
  return isUnder(p, entry);
}

/** Decide whether a write to `filePath` is permitted under `policy`. */
export function decide(filePath: string, policy: FirewallPolicy): FirewallDecision {
  const { mode, enabled } = policy;
  if (!enabled) return { allowed: true, matchedRule: "disabled", mode };
  if (mode === "off") return { allowed: true, matchedRule: "off", mode };

  // Deny rules win everywhere, even inside the vault or an allowed root.
  for (const d of policy.denyPaths) {
    if (matches(filePath, d)) {
      return { allowed: mode === "warn", matchedRule: `deny:${d}`, mode };
    }
  }

  // Cross-vault: writes to a sibling registered vault are blocked even if that
  // vault is also listed in allowPaths.  Precedence: deny > cross-vault > vault
  // > allowPaths > outside-vault.
  for (const ov of policy.otherVaults) {
    if (isUnder(filePath, ov)) {
      return {
        allowed: mode === "warn",
        matchedRule: "cross-vault",
        mode,
      };
    }
  }

  if (isUnder(filePath, policy.vault)) {
    return { allowed: true, matchedRule: "vault", mode };
  }
  for (const a of policy.allowPaths) {
    if (matches(filePath, a)) return { allowed: true, matchedRule: `allow:${a}`, mode };
  }

  // Outside every allowed root: block under enforce, advise under warn.
  return { allowed: mode === "warn", matchedRule: "outside-vault", mode };
}
