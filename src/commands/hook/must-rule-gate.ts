/**
 * must-rule-gate — the hook-mode decision logic that scripts/enforce-must-rule.sh
 * ran inline, now in the engine (migration-plan.md Phase 3).
 *
 * ADVISORY, NON-BLOCKING (mirrors the bash contract): when a CLAUDE.md edit adds
 * an imperative must/never/always rule, this gate writes a two-line `[enforce-
 * must-rule] …` notice to STDERR and ALWAYS reports exit 0. It NEVER emits a
 * `{"decision":"block"}` line — it cannot interrupt a write. The bash wrapper
 * that calls this fails OPEN on an internal error (Bun-absent → exit 0, the write
 * proceeds) — see scripts/enforce-must-rule.sh.
 *
 * This is the firewall-adjacent wrapper around the pure decision core in
 * [`../../core/must-rule-check.ts`](../../core/must-rule-check.ts) (checkMustRule):
 * the path filter, the content-vs-new_string selection, and the per-line
 * must/never/always count live there; this gate reproduces the two-line stderr
 * notice with the SAME rule-line count verbatim.
 *
 * No `any`; checkMustRule narrows the payload itself (it accepts `unknown`). The
 * gate passes a reconstructed payload object so the core's selection logic
 * (content preferred over new_string) stays the single source of truth.
 */

import { checkMustRule } from "../../core/must-rule-check.ts";
import type { HookInput } from "../../core/hook-input.ts";

/** The result the must-rule gate returns — always exit 0; optional stderr. */
export interface MustRuleGateResult {
  /** Always 0 (advisory, never blocks). */
  readonly exitCode: 0;
  /** The two-line `[enforce-must-rule] …` notice when a rule is added; "" else. */
  readonly stderr: string;
}

/** Frozen pass result (exit 0, no stderr). */
const PASS: MustRuleGateResult = Object.freeze({ exitCode: 0, stderr: "" });

export interface MustRuleGateOptions {
  /** The parsed, boundary-narrowed hook payload. */
  readonly input: HookInput;
}

/**
 * The hook-mode must-rule gate decision.
 *
 * Returns `{ exitCode: 0, stderr: "[enforce-must-rule] note: … N … line(s).
 * \n[enforce-must-rule] If any is a hard rule, …" }` when a CLAUDE.md edit adds
 * one or more must/never/always lines, else PASS. The stderr text reproduces
 * scripts/enforce-must-rule.sh:36-37 VERBATIM, including the rule-line count.
 */
export function mustRuleHookGate(opts: MustRuleGateOptions): MustRuleGateResult {
  const { input } = opts;

  // Rebuild the minimal payload shape checkMustRule narrows (it owns the
  // content-preferred-over-new_string selection and the path filter).
  const findings = checkMustRule({
    tool_input: {
      file_path: input.filePath,
      content: input.content,
      new_string: input.newString,
    },
  });
  if (findings.length === 0) return PASS;

  // The core message embeds the line count; recover it for the bash-verbatim
  // two-line notice (the bash printed "${RULE_HITS} … line(s)").
  const count = ruleLineCount(input);
  const line1 = `[enforce-must-rule] note: this CLAUDE.md edit adds ${count} imperative 'must/never/always' line(s).`;
  const line2 = `[enforce-must-rule] If any is a hard rule, back it with a PreToolUse/Stop hook or a CI check — an unenforced rule is advisory only.`;
  return Object.freeze({ exitCode: 0, stderr: `${line1}\n${line2}\n` });
}

/**
 * Count lines containing a must/never/always word in the added text — the same
 * per-line, case-insensitive count the bash `grep -ciE '\b(must|never|always)\b'`
 * produced. The added text is content (Write) preferred over new_string (Edit),
 * matching scripts/enforce-must-rule.sh:30.
 */
function ruleLineCount(input: HookInput): number {
  const text = input.content !== "" ? input.content : input.newString;
  const pattern = /\b(?:must|never|always)\b/i;
  let count = 0;
  for (const line of text.split("\n")) {
    if (pattern.test(line)) count++;
  }
  return count;
}
