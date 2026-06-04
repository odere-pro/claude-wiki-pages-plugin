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
 */

import { resolve } from "node:path";

export type FirewallMode = "enforce" | "warn" | "off";

export interface FirewallPolicy {
  readonly enabled: boolean;
  readonly mode: FirewallMode;
  /** Resolved vault directory (always implicitly allowed). */
  readonly vault: string;
  readonly allowPaths: readonly string[];
  readonly denyPaths: readonly string[];
}

export interface FirewallDecision {
  readonly allowed: boolean;
  /** Why the decision was reached, e.g. "vault", "deny:&lt;glob&gt;", "outside-vault". */
  readonly matchedRule: string;
  readonly mode: FirewallMode;
}

/** Translate a simple glob (`*` within a segment, `**` across segments) to a RegExp. */
function globToRegExp(glob: string): RegExp {
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

/** True when `path` is the directory `root` or sits underneath it. */
function isUnder(path: string, root: string): boolean {
  const r = resolve(root);
  const p = resolve(path);
  return p === r || p.startsWith(r.endsWith("/") ? r : r + "/");
}

/** Match a path against an allow/deny entry: glob if it contains `*`, else a directory prefix. */
function matches(path: string, entry: string): boolean {
  const p = resolve(path);
  if (entry.includes("*")) return globToRegExp(entry).test(p) || globToRegExp(entry).test(path);
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

  if (isUnder(filePath, policy.vault)) {
    return { allowed: true, matchedRule: "vault", mode };
  }
  for (const a of policy.allowPaths) {
    if (matches(filePath, a)) return { allowed: true, matchedRule: `allow:${a}`, mode };
  }

  // Outside every allowed root: block under enforce, advise under warn.
  return { allowed: mode === "warn", matchedRule: "outside-vault", mode };
}
