/**
 * attachment-gate — the hook-mode decision logic that
 * scripts/validate-attachments.sh ran inline, now in the engine
 * (migration-plan.md Phase 3).
 *
 * This is the firewall-adjacent wrapper around the pure decision core in
 * [`../../core/attachment-check.ts`](../../core/attachment-check.ts): it takes a
 * parsed HookInput, reconstructs the POST-operation content (Write content as-is,
 * Edit = disk content with old_string→new_string applied), derives the vault root
 * the way the bash hook did (strip `/wiki/_sources/…` from the file path), and
 * returns a HookDecision the CLI serialises into the
 * `{"decision":"block","reason":…}` contract.
 *
 * SECURITY classification (this unit's contract): a non-text source with a
 * missing/dangling attachment is a provenance-integrity failure, so the bash
 * wrapper fails CLOSED on an internal error (Bun-absent → block any in-scope
 * _sources write) — see scripts/validate-attachments.sh.
 *
 * No `any`; the HookInput is already narrowed at the boundary
 * (src/core/hook-input.ts). The disk read is tolerant (readFileSafe) — an
 * unreadable target degrades like the bash `[ -f … ] || exit 0` to allow.
 */

import { readFileSafe } from "../../core/fs.ts";
import { checkAttachment } from "../../core/attachment-check.ts";
import type { HookInput } from "../../core/hook-input.ts";
import type { HookDecision } from "./frontmatter-gate.ts";

/** Frozen allow decision (the bash `exit 0` with no block JSON). */
const ALLOW: HookDecision = Object.freeze({ block: false });

/** Source notes in scope live under `wiki/_sources/` and end in `.md`. */
const IN_SCOPE = /\/wiki\/_sources\/[^/]*\.md$/;

export interface AttachmentGateOptions {
  /** The parsed, boundary-narrowed hook payload. */
  readonly input: HookInput;
  /**
   * Disk reader for the Edit reconstruction; defaults to readFileSafe.
   * Injectable for tests so an Edit case need not touch disk.
   */
  readonly readFile?: (absPath: string) => string | null;
  /** Existence predicate forwarded to the core attachment check (test seam). */
  readonly exists?: (absPath: string) => boolean;
}

/**
 * Derive the vault root the bash hook used: the file path with everything from
 * `/wiki/_sources/` onward removed (scripts/validate-attachments.sh:23).
 */
function vaultRootFromPath(filePath: string): string {
  const idx = filePath.indexOf("/wiki/_sources/");
  return idx === -1 ? "" : filePath.slice(0, idx);
}

/**
 * Reconstruct the POST-operation content the bash hook validated:
 *   - Write → tool_input.content as-is.
 *   - Edit  → read the existing file; if old_string is present, replace its FIRST
 *     occurrence with new_string (mirroring the bash `awk sub(o,n)`); else the
 *     unchanged disk content. A missing file → null (the bash `[ -f … ] || exit
 *     0` allow).
 * Any other tool → null (the bash `else exit 0`).
 */
function postOperationContent(
  input: HookInput,
  readFile: (p: string) => string | null,
): string | null {
  if (input.toolName === "Write") return input.content;
  if (input.toolName === "Edit") {
    const orig = readFile(input.filePath);
    if (orig === null) return null; // bash `[ -f "$FILE_PATH" ] || exit 0`.
    if (input.oldString === "") return orig;
    // Replace the FIRST occurrence only — literal, no regex (bash awk sub).
    const at = orig.indexOf(input.oldString);
    if (at === -1) return orig;
    return orig.slice(0, at) + input.newString + orig.slice(at + input.oldString.length);
  }
  return null;
}

/**
 * The hook-mode attachment gate decision.
 *
 * Returns an allow/block decision matching scripts/validate-attachments.sh: only
 * in-scope `_sources/*.md` writes are inspected; a non-text source missing or
 * with a dangling attachment_path is blocked with the core message verbatim.
 */
export function attachmentHookGate(opts: AttachmentGateOptions): HookDecision {
  const { input } = opts;
  const readFile = opts.readFile ?? readFileSafe;

  // Path filter (the bash `case … */wiki/_sources/*.md`).
  if (!IN_SCOPE.test(input.filePath)) return ALLOW;

  const content = postOperationContent(input, readFile);
  if (content === null || content.trim() === "") return ALLOW;

  const findings = checkAttachment({
    filePath: input.filePath,
    vaultRoot: vaultRootFromPath(input.filePath),
    content,
    ...(opts.exists !== undefined ? { exists: opts.exists } : {}),
  });

  if (findings.length === 0) return ALLOW;
  const first = findings[0];
  return Object.freeze({
    block: true,
    reason: first?.message ?? "source note attachment is missing or dangling.",
  });
}
