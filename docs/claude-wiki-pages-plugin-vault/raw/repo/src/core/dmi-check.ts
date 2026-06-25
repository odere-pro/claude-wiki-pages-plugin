/**
 * dmi-check — disable-model-invocation enforcement for SKILL.md writes.
 *
 * Pure decision logic ported from scripts/enforce-dmi.sh — the single
 * PreToolUse gate that exits 2 (a HARD block; Claude treats a non-zero
 * non-2 hook exit as a harness error, so DMI uses 2 deliberately). The rule:
 * a write to a skills SKILL.md path is BLOCKED when the page body carries a
 * side-effecting verb (scaffold / deploy / commit / push / publish / release /
 * delete / post / write[s] / create[s] / overwrite[s]) but the frontmatter is
 * MISSING `disable-model-invocation: true`.
 *
 * CRITICAL integration contract (tmp/migration-plan.md Phase 3): the thin bash
 * wrapper that replaces enforce-dmi.sh MUST preserve the HARD `exit 2`
 * semantics. This module therefore encodes the violation DISTINCTLY so the
 * wrapper never confuses a DMI hard-block with a normal error-tier (exit 1)
 * finding:
 *   - `checkDmi()` returns `Finding[]` tagged with the dedicated `DMI_CHECK`
 *     name (the clean function signature the integrator wires in);
 *   - `dmiDecision()` is the typed helper that maps DMI findings → exit code 2.
 *
 * Pure: no filesystem reads, no network, no side effects, no mutation. The hook
 * caller supplies the resolved file path and the candidate content (from
 * tool_input or from disk for an Edit). Same inputs → same findings out.
 *
 * Reuses src/core/frontmatter.ts (splitFrontmatter) so body extraction matches
 * the engine's single YAML splitter rather than re-deriving the awk heuristic.
 */

import type { Finding } from "./report.ts";
import { splitFrontmatter } from "./frontmatter.ts";

/**
 * The check name stamped on every finding this module produces. The thin bash
 * wrapper and any engine entry point key the exit-2 hard-block mapping off this
 * value — it is the distinct marker the migration contract requires.
 */
export const DMI_CHECK = "dmi" as const;

/**
 * Exit code Claude Code treats as a HARD PreToolUse block (mirrors
 * scripts/enforce-dmi.sh `exit 2`). Named so the wrapper never reuses a magic
 * literal.
 */
export const DMI_BLOCK_EXIT_CODE = 2 as const;

/**
 * Side-effecting verbs whose presence in a SKILL.md body requires the
 * `disable-model-invocation: true` opt-out. Mirrors the alternation in
 * scripts/enforce-dmi.sh:
 *   \b(scaffold|deploy|commit|push|publish|release|delete|post|writes?|creates?|overwrites?)\b
 */
const SIDE_EFFECTING_VERBS = [
  "scaffold",
  "deploy",
  "commit",
  "push",
  "publish",
  "release",
  "delete",
  "post",
  "writes?",
  "creates?",
  "overwrites?",
] as const;

/**
 * Word-boundary, case-insensitive matcher for any side-effecting verb. The
 * `s?` suffixes mirror the bash `writes?|creates?|overwrites?` so both singular
 * and plural forms trip the gate, while `\b` keeps substrings of larger words
 * (e.g. "redeployment") from matching — same as the bash `grep -E '\b…\b'`.
 */
const SIDE_EFFECTING_PATTERN = new RegExp(`\\b(${SIDE_EFFECTING_VERBS.join("|")})\\b`, "i");

/**
 * Matches `disable-model-invocation: true` in frontmatter, tolerating any run
 * of inline whitespace after the colon (mirrors the bash
 * `grep 'disable-model-invocation:[[:space:]]*true'`).
 */
const DMI_FLAG_PATTERN = /disable-model-invocation:[ \t]*true/;

/**
 * True when `filePath` is a skills SKILL.md path the gate applies to. Mirrors
 * the bash glob (any `skills/<dir>/SKILL.md` segment) anywhere in the
 * (possibly nested) path. Path separators are normalised so a Windows-style
 * path still matches.
 */
function isSkillFile(filePath: string): boolean {
  const normalised = filePath.split(/[\\/]/).join("/");
  return /(^|\/)skills\/[^/]+\/SKILL\.md$/.test(normalised);
}

/**
 * Extract the body to scan for side-effecting verbs. The engine's
 * `splitFrontmatter` isolates the leading `--- … ---` block; we scan the body
 * after it. When there is no frontmatter (or the block is unterminated),
 * `splitFrontmatter` returns the whole content as the body — which matches the
 * bash fallback `if [[ -z "$BODY" ]]; then BODY="$CONTENT"; fi`.
 */
function bodyToScan(content: string): string {
  const { body } = splitFrontmatter(content);
  return body.trim() === "" ? content : body;
}

/**
 * Decide whether a SKILL.md write must be blocked for missing
 * `disable-model-invocation: true`.
 *
 * Returns a single error-severity `Finding` tagged `DMI_CHECK` when the path is
 * a gated SKILL.md, the body carries a side-effecting verb, and the DMI flag is
 * absent — otherwise an empty array. Never throws; pure over its inputs.
 *
 * @param filePath - the resolved write target (tool_input.file_path).
 * @param content  - the candidate file content (tool_input.content or disk read).
 */
export function checkDmi(filePath: string, content: string): Finding[] {
  // ── Path filter: only skills SKILL.md writes are gated (bash exits 0 else). ──
  if (!isSkillFile(filePath)) return [];

  // ── Empty content is a no-op (bash exits 0 when CONTENT is empty). ──────────
  if (content.trim() === "") return [];

  // ── DMI opt-out present → allowed regardless of verbs (bash exits 0). ───────
  if (DMI_FLAG_PATTERN.test(content)) return [];

  // ── Scan the body for a side-effecting verb. ────────────────────────────────
  if (!SIDE_EFFECTING_PATTERN.test(bodyToScan(content))) return [];

  return [
    {
      severity: "error",
      check: DMI_CHECK,
      message:
        `BLOCKED: ${filePath} contains side-effecting verbs but is missing ` +
        `'disable-model-invocation: true' in frontmatter. Add it before this edit.`,
      file: filePath,
    },
  ];
}

/** Typed PreToolUse decision the thin wrapper maps to its exit code. */
export interface DmiDecision {
  /** True when a DMI finding requires the HARD block. */
  readonly blocked: boolean;
  /** Exit code to surface: 2 (hard block) on a violation, else 0. */
  readonly exitCode: number;
  /** Block reason for the hook's stderr / decision JSON; "" when not blocked. */
  readonly reason: string;
}

/**
 * Map findings to the enforce-dmi HARD `exit 2` contract. ONLY findings tagged
 * `DMI_CHECK` drive the block — a foreign finding (e.g. from `schema`) never
 * triggers the DMI exit-2 path. This is the distinct-encoding guarantee the
 * migration plan requires so the wrapper preserves the exit-2 semantics without
 * conflating them with normal error-tier (exit 1) findings.
 */
export function dmiDecision(findings: readonly Finding[], filePath: string): DmiDecision {
  const violation = findings.find((f) => f.check === DMI_CHECK && f.severity === "error");
  if (violation === undefined) {
    return { blocked: false, exitCode: 0, reason: "" };
  }
  return {
    blocked: true,
    exitCode: DMI_BLOCK_EXIT_CODE,
    reason: `[${DMI_CHECK}] ${violation.message} (${filePath})`,
  };
}
