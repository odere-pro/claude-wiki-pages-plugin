/**
 * Raw-immutability decision core — the pure twin of `scripts/protect-raw.sh`.
 *
 * `raw/` is append-only and hook-protected: sources are immutable once added
 * (TEAM-BRIEF.md §5 "Raw is immutable"; rules/raw-immutable.md). This module is
 * the single, typed authority for the decision the PreToolUse `Write|Edit` hook
 * makes — given a target path, a tool name, and (for Write) the proposed
 * content, decide ALLOW (no findings) or BLOCK (one error finding).
 *
 * It is PURE and SIDE-EFFECT-FREE except for reading the filesystem to learn
 * whether the target already exists and to resolve symlinks — the same facts
 * the bash hook reads (`[ -f ... ]`, canonicalize). It writes nothing.
 *
 * SECURITY — default-deny / fail-closed:
 *   - The boundary check runs against the PHYSICAL (symlink-resolved) path, so a
 *     traversal (`wiki/../raw/x`) or a symlink into `raw/` cannot slip past the
 *     glob (mirrors `scripts/firewall.sh` / `src/core/firewall.ts` physicalPath).
 *   - Once a path is inside `raw/`, anything that is not an explicitly-sanctioned
 *     ALLOW is BLOCKED — including unknown tool names. The carve-out is narrow on
 *     purpose; the integrator wires this fail-closed (Bun-absent ⇒ block).
 *
 * The sanctioned durable-memory carve-out (TEAM-BRIEF.md §5, resolved decision
 * #4): a Write of a NEW file under `<vault>/raw/agent-sessions/` whose YAML
 * FRONTMATTER declares `source_type: agent-session` is permitted. The marker is
 * read from the frontmatter block only — a body line of the same shape never
 * grants entry — so a `source_type: paper` (or absent) file cannot smuggle
 * itself in by repeating the marker in its body.
 */

import { resolve, dirname, basename, isAbsolute } from "node:path";
import { realpathSync, lstatSync, readlinkSync, existsSync } from "node:fs";
import { splitFrontmatter } from "./frontmatter";
import type { Finding } from "./report";
import { SYMLINK_LOOP_MAX } from "./symlink-limit";

/** Tool names the PreToolUse `Write|Edit` matcher can deliver. */
export type WriteTool = string;

export interface RawWriteRequest {
  /** Resolved active-vault directory; its `raw/` subtree is the protected boundary. */
  readonly vault: string;
  /** The tool attempting the write (e.g. "Write", "Edit"). */
  readonly tool: WriteTool;
  /** Absolute target path the tool would write/edit. Empty ⇒ nothing to guard. */
  readonly filePath: string;
  /** Proposed content for a Write (used only for the carve-out marker check). */
  readonly content?: string;
}

const CHECK = "raw-immutable";
const AGENT_SESSION_MARKER = /^source_type:[ \t]*agent-session[ \t]*$/m;

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
 * (the write target may be a new file). Mirrors `physicalPath` in
 * `src/core/firewall.ts` and `_realpath_physical` in `scripts/firewall.sh`.
 */
function physicalPath(filePath: string): string {
  let target = resolve(filePath);
  const tail: string[] = [];
  while (target !== dirname(target) && !lexists(target)) {
    tail.unshift(basename(target));
    target = dirname(target);
  }
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

/** True when physical `path` is the directory `root` or sits underneath it. */
function isUnder(path: string, root: string): boolean {
  const r = physicalPath(root);
  const p = physicalPath(path);
  return p === r || p.startsWith(r.endsWith("/") ? r : r + "/");
}

/** Does the proposed content carry `source_type: agent-session` in its FRONTMATTER? */
function hasAgentSessionMarker(content: string | undefined): boolean {
  if (typeof content !== "string" || content === "") return false;
  const { frontmatter } = splitFrontmatter(content);
  if (frontmatter === null) return false;
  return AGENT_SESSION_MARKER.test(frontmatter);
}

function block(message: string, file: string): Finding[] {
  return [{ severity: "error", check: CHECK, message, file }];
}

/**
 * Decide whether a Write/Edit to `filePath` is permitted under raw-immutability.
 *
 * Returns an empty array on ALLOW and a single error `Finding` on BLOCK, so the
 * caller (the `lint`/firewall-adjacent composition) can fold it into a `Report`
 * and the hook can map a non-empty result to the block-decision JSON contract.
 */
export function checkRawWrite(req: RawWriteRequest): Finding[] {
  const { vault, tool, filePath, content } = req;

  // No target path — nothing to guard (mirrors the bash early `exit 0`).
  if (!filePath) return [];

  const rawRoot = resolve(vault, "raw");
  // Outside the protected boundary — not this gate's concern.
  if (!isUnder(filePath, rawRoot)) return [];

  const vaultName = basename(resolve(vault));
  const label = `${vaultName || "vault"}/raw/`;
  const physical = physicalPath(filePath);
  const exists = existsSync(physical);

  // ── Sanctioned agent-session carve-out ──────────────────────────────────
  // PERMIT only: Write of a NEW file under raw/agent-sessions/ whose frontmatter
  // declares source_type: agent-session. Everything else under the fence falls
  // through to the default-deny rules below.
  const agentSessionsRoot = resolve(rawRoot, "agent-sessions");
  const underFence = isUnder(filePath, agentSessionsRoot);
  if (underFence && tool === "Write" && !exists) {
    if (hasAgentSessionMarker(content)) return [];
    return block(
      `Files under ${label}agent-sessions/ must declare 'source_type: agent-session' in their YAML frontmatter (not just the body). This is the sanctioned carve-out for durable memory — use it only for agent-session sources.`,
      filePath,
    );
  }

  // ── Default-deny under raw/ ─────────────────────────────────────────────
  // Edit (modifying any existing or targeted file) is always blocked.
  if (tool === "Edit") {
    return block(
      `${label} is immutable. Source files must not be modified after ingestion. Note corrections in the wiki page instead.`,
      filePath,
    );
  }

  // Write that overwrites an existing source is blocked.
  if (tool === "Write" && exists) {
    return block(
      `Cannot overwrite existing source in ${label}. Sources are immutable once added.`,
      filePath,
    );
  }

  // Write of a brand-new file directly under raw/ (not the fence) is an added
  // source — permitted, exactly as the bash hook falls through to exit 0.
  if (tool === "Write") return [];

  // Any other tool inside raw/ (e.g. MultiEdit) is blocked: default-deny, never
  // silently allowed. The carve-out is the only widening of this boundary.
  return block(
    `${label} is immutable. '${tool}' is not a permitted operation on sources after ingestion.`,
    filePath,
  );
}
