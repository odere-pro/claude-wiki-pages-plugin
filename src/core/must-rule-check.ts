/**
 * must-rule-check.ts — pure TS port of scripts/enforce-must-rule.sh.
 *
 * When a CLAUDE.md edit introduces an imperative "must / never / always" rule,
 * surface a reminder to back it with an enforcement hook or CI check — an
 * unenforced rule is a polite request, not a guarantee.
 *
 * NON-BLOCKING BY DESIGN (mirrors the bash contract, scripts/enforce-must-rule.sh
 * "ALWAYS exits 0"): this module emits warn-tier findings only and never errors.
 * The integrator that wires it into the hook layer keeps the advisory, exit-0
 * behaviour; nothing here ever produces a block decision.
 *
 * Behavioural equivalence to the bash script (scripts/enforce-must-rule.sh):
 *   - Path filter (case 22-25): inspect only a `.../CLAUDE.md` or a bare
 *     `CLAUDE.md`; everything else is a no-op.
 *   - Text source (lines 30-31): the added text is `tool_input.content` (Write)
 *     or `tool_input.new_string` (Edit), content preferred — matching the
 *     json-tool `field tool_input.content tool_input.new_string` first-non-empty
 *     order. A MultiEdit-style payload with neither is a no-op.
 *   - Heuristic (line 34): `grep -ciE '\b(must|never|always)\b'` counts the
 *     number of MATCHING LINES (not total word occurrences). A line with several
 *     keywords counts once.
 *
 * Untrusted input (TEAM-BRIEF §5 "untrusted input"; migration-plan "Error
 * handling"): the hook payload is `unknown` and narrowed with type guards at the
 * boundary. A malformed or unexpected shape yields `[]` — the gate never throws,
 * so it can never break a write.
 *
 * Reused primitive: src/core/report.ts — Finding (type only).
 */

import type { Finding } from "./report.ts";

/** Check name attached to every finding this module emits. */
const CHECK_NAME = "must-rule";

/**
 * Imperative rule words, word-bounded and case-insensitive, mirroring the bash
 * pattern `\b(must|never|always)\b` passed to `grep -iE`. `\b` in JS regex is
 * the same ASCII word boundary `grep -E` uses for these alphabetic keywords, so
 * "mustard" / "nevertheless" do not match.
 */
const RULE_WORD_PATTERN = /\b(?:must|never|always)\b/i;

/** A page is in scope iff its path is a bare or nested `CLAUDE.md`. */
function isClaudeMd(filePath: string): boolean {
  return filePath === "CLAUDE.md" || filePath.endsWith("/CLAUDE.md");
}

/**
 * Read a non-empty string property from an object, else "".
 * Mirrors json-tool's `dottedString` (non-string → "").
 */
function stringField(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

/**
 * Extract the added text from a hook tool_input: `content` (Write) preferred,
 * then `new_string` (Edit). Returns "" when neither is a string (e.g. MultiEdit).
 */
function addedText(toolInput: Record<string, unknown>): string {
  const content = stringField(toolInput, "content");
  if (content !== "") return content;
  return stringField(toolInput, "new_string");
}

/**
 * Count the number of lines containing at least one imperative rule word,
 * replicating `grep -ciE '\b(must|never|always)\b'` (per-line, case-insensitive).
 */
function countRuleLines(text: string): number {
  let count = 0;
  for (const line of text.split("\n")) {
    if (RULE_WORD_PATTERN.test(line)) count++;
  }
  return count;
}

/** Narrow an `unknown` value to a plain object record, else undefined. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/**
 * Inspect a PreToolUse Write/Edit/MultiEdit payload for an imperative rule
 * landing in a CLAUDE.md with no backing hook.
 *
 * @param payload - The hook stdin JSON, already parsed (untrusted `unknown`).
 * @returns A single warn-severity finding when one or more rule lines are added
 *          to a CLAUDE.md, otherwise an empty array. Never throws; never blocks.
 */
export function checkMustRule(payload: unknown): Finding[] {
  const root = asRecord(payload);
  if (root === undefined) return [];

  const toolInput = asRecord(root["tool_input"]);
  if (toolInput === undefined) return [];

  const filePath = stringField(toolInput, "file_path");
  if (filePath === "" || !isClaudeMd(filePath)) return [];

  const text = addedText(toolInput);
  if (text === "") return [];

  const ruleLines = countRuleLines(text);
  if (ruleLines === 0) return [];

  const lineWord = ruleLines === 1 ? "line" : "lines";
  return [
    {
      severity: "warn",
      check: CHECK_NAME,
      message:
        `This CLAUDE.md edit adds ${ruleLines} imperative 'must/never/always' ${lineWord}. ` +
        `If any is a hard rule, back it with a PreToolUse/Stop hook or a CI check — ` +
        `an unenforced rule is advisory only.`,
      file: filePath,
    },
  ];
}
