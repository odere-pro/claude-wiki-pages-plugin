/**
 * protect-raw-gate — the hook-mode decision logic that scripts/protect-raw.sh
 * ran inline, now in the engine (migration-plan.md Phase 3).
 *
 * INTEGRATION FINDING (dual-run on tests/scripts/protect-raw.bats): the shared
 * pure core src/core/protect-raw-check.ts decides the boundary by ABSOLUTE
 * containment under the resolved vault (`isUnder(filePath, resolve(vault,
 * "raw"))`). The bash hook instead used a PATH-SEGMENT glob over the canonical
 * path (a `<VAULT_NAME>/raw/` segment match), which matches ANY absolute path
 * carrying the `<vaultName>/raw/` segment even when the resolved vault is a different
 * (possibly relative) path. The bats contract pins the segment-glob behaviour
 * (e.g. CLAUDE_WIKI_PAGES_VAULT=vault with a file at
 * /tmp/test-project/vault/raw/sample.md). To preserve the hook contract VERBATIM
 * this gate reproduces the bash canonicalisation + segment glob + the
 * frontmatter-scoped agent-session carve-out directly, deriving the boundary from
 * the vault BASENAME — not the core's absolute-containment model.
 *
 * SECURITY classification (this unit's contract): raw/ immutability is a security
 * boundary. The bash wrapper that calls this fails CLOSED on an internal error
 * (Bun-absent → block any write under the segment glob) — see
 * scripts/protect-raw.sh. This module never throws.
 *
 * No `any`; the HookInput is already narrowed at the boundary.
 */

import { basename, dirname, resolve, isAbsolute } from "node:path";
import { lstatSync, readlinkSync, realpathSync, existsSync } from "node:fs";
import { splitFrontmatter } from "../../core/frontmatter.ts";
import type { HookInput } from "../../core/hook-input.ts";
import type { HookDecision } from "./frontmatter-gate.ts";

/** Frozen allow decision (the bash `exit 0` with no block JSON). */
const ALLOW: HookDecision = Object.freeze({ block: false });

/** Linux MAXSYMLINKS; mirrors firewall.{sh,ts} and protect-raw-check.ts. */
const SYMLINK_LOOP_MAX = 40;

/** `^source_type:[[:space:]]*agent-session[[:space:]]*$` (the bash marker). */
const AGENT_SESSION_MARKER = /^source_type:[ \t]*agent-session[ \t]*$/m;

export interface ProtectRawGateOptions {
  /** Absolute path to the resolved active vault root (for the label fallback). */
  readonly vault: string;
  /** Basename of the resolved vault (the bash `$VAULT_NAME`); drives the glob. */
  readonly vaultName: string;
  /** The parsed, boundary-narrowed hook payload. */
  readonly input: HookInput;
}

function block(reason: string): HookDecision {
  return Object.freeze({ block: true, reason });
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
 * Canonicalise the path the way scripts/protect-raw.sh `canonicalize` did:
 * resolve the DIRECTORY (the target may be a new file) and re-append the
 * basename, dereferencing symlinks/traversal so `raw/../sources/x` or a symlink
 * into raw/ cannot evade the segment glob. Tolerant: a non-resolvable directory
 * degrades to the input path (the bash `else printf '%s' "$target"`).
 */
function canonicalize(filePath: string): string {
  const base = basename(filePath);
  let dir = resolve(dirname(filePath));
  // Walk symlinked / non-existent ancestors down to a real directory.
  let guard = 0;
  while (guard < SYMLINK_LOOP_MAX && isSymlink(dir)) {
    const link = readlinkSync(dir);
    dir = isAbsolute(link) ? link : resolve(dirname(dir), link);
    guard++;
  }
  let physDir: string;
  try {
    physDir = realpathSync(dir);
  } catch {
    return filePath; // directory unresolvable → bash fallback to the raw path.
  }
  return resolve(physDir, base);
}

/** True when `canon` carries the `<vaultName>/raw/` (or any `raw/`) segment. */
function underRaw(canon: string, vaultName: string): boolean {
  const norm = canon.split(/[\\/]/).join("/");
  if (vaultName !== "") return norm.includes(`/${vaultName}/raw/`);
  return norm.includes("/raw/");
}

/** True when `canon` carries the `<vaultName>/raw/agent-sessions/` segment. */
function underAgentSessions(canon: string, vaultName: string): boolean {
  const norm = canon.split(/[\\/]/).join("/");
  if (vaultName !== "") return norm.includes(`/${vaultName}/raw/agent-sessions/`);
  return norm.includes("/raw/agent-sessions/");
}

/** Does the proposed content carry `source_type: agent-session` in its FRONTMATTER? */
function hasAgentSessionMarker(content: string): boolean {
  if (content === "") return false;
  const { frontmatter } = splitFrontmatter(content);
  if (frontmatter === null) return false;
  return AGENT_SESSION_MARKER.test(frontmatter);
}

/**
 * The hook-mode raw-immutability gate decision — a faithful port of
 * scripts/protect-raw.sh. Empty file_path → allow; otherwise canonicalise, apply
 * the segment-glob boundary, the agent-session carve-out, and the default-deny
 * rules (block Edit; block Write overwriting an existing file; allow a new file).
 * Block reasons are reproduced VERBATIM from the bash hook.
 */
export function protectRawHookGate(opts: ProtectRawGateOptions): HookDecision {
  const { vaultName, input } = opts;

  // Empty file path → allow (the bash `[ -n "$FILE_PATH" ] || exit 0`).
  if (input.filePath === "") return ALLOW;

  const canon = canonicalize(input.filePath);

  // Boundary: only guard paths under <vaultName>/raw/ (else exit 0).
  if (!underRaw(canon, vaultName)) return ALLOW;

  const label = `${vaultName || "vault"}/raw/`;
  const exists = existsSync(canon);

  // ── Sanctioned agent-session carve-out ──────────────────────────────────
  // PERMIT only: Write of a NEW file under raw/agent-sessions/ whose frontmatter
  // declares source_type: agent-session. Inside the fence without the marker is
  // blocked; everything else falls through to the default-deny rules.
  if (input.toolName === "Write" && underAgentSessions(canon, vaultName) && !exists) {
    if (hasAgentSessionMarker(input.content)) return ALLOW;
    return block(
      `Files under ${label}agent-sessions/ must declare 'source_type: agent-session' in their YAML frontmatter (not just the body). This is the sanctioned carve-out for durable memory — use it only for agent-session sources.`,
    );
  }

  // ── Default-deny under raw/ ─────────────────────────────────────────────
  // Block Edit (modifying any existing or targeted file).
  if (input.toolName === "Edit") {
    return block(
      `${label} is immutable. Source files must not be modified after ingestion. Note corrections in the wiki page instead.`,
    );
  }

  // Block Write that overwrites an existing source.
  if (input.toolName === "Write" && exists) {
    return block(`Cannot overwrite existing source in ${label}. Sources are immutable once added.`);
  }

  // Write of a brand-new file under raw/ (not the fence) is an added source —
  // permitted, exactly as the bash hook falls through to exit 0.
  return ALLOW;
}
