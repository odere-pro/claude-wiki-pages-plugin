/**
 * hook-input — the untrusted-boundary parser for the PreToolUse hook's stdin
 * JSON (migration-plan.md Phase 3 + "Error handling": validate the hook stdin
 * JSON with a hand-rolled guard at the boundary — never trust the payload shape;
 * no `any`).
 *
 * The Claude Code PreToolUse payload is shaped roughly as:
 *   { "tool_name": "Write"|"Edit"|…,
 *     "tool_input": { "file_path"|"file": "…", "content": "…",
 *                     "old_string": "…", "new_string": "…" } }
 *
 * This module reduces it to a flat, fully-typed HookInput. Every field is a
 * string: a missing or non-string value degrades to "" (mirroring the bash
 * `jq -r '… // empty'` extraction that yielded the empty string). Parsing never
 * throws — a malformed body yields an all-empty HookInput so the caller (an
 * advisory gate) can fail-open by exiting 0, while a security gate fails closed
 * on its own policy, not on a parse exception.
 */

/** The flattened, fully-typed view of the PreToolUse stdin payload. */
export interface HookInput {
  /** `.tool_name` — "Write" | "Edit" | … (or "" when absent/non-string). */
  readonly toolName: string;
  /** `.tool_input.file_path` then `.tool_input.file` (jq // fallback). */
  readonly filePath: string;
  /** `.tool_input.content` — the full file body for a Write (or ""). */
  readonly content: string;
  /** `.tool_input.old_string` — the pre-edit text for an Edit (or ""). */
  readonly oldString: string;
  /** `.tool_input.new_string` — the post-edit text for an Edit (or ""). */
  readonly newString: string;
}

/** A frozen all-empty HookInput, returned on any parse failure. */
const EMPTY_INPUT: HookInput = Object.freeze({
  toolName: "",
  filePath: "",
  content: "",
  oldString: "",
  newString: "",
});

/** Read a string property from an unknown object, or "" when absent/non-string. */
function strProp(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

/** Narrow an unknown to a plain object record (not null, not an array). */
function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * Parse the hook's stdin JSON into a flat HookInput.
 *
 * Tolerant by design: malformed JSON, a missing `tool_input`, or non-string
 * field values all degrade to "" rather than throwing — the boundary contract
 * the bash hook had via `jq -r '… // empty'`.
 */
export function parseHookInput(raw: string): HookInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_INPUT;
  }
  const root = asRecord(parsed);
  if (root === null) return EMPTY_INPUT;
  const toolInput = asRecord(root["tool_input"]) ?? {};
  const filePath = strProp(toolInput, "file_path") || strProp(toolInput, "file");
  return Object.freeze({
    toolName: strProp(root, "tool_name"),
    filePath,
    content: strProp(toolInput, "content"),
    oldString: strProp(toolInput, "old_string"),
    newString: strProp(toolInput, "new_string"),
  });
}
