/**
 * dmi-gate — the hook-mode decision logic that scripts/enforce-dmi.sh ran
 * inline, now in the engine (migration-plan.md Phase 3).
 *
 * CRITICAL contract (tmp/migration-plan.md Phase 3 + this unit): enforce-dmi is
 * the ONE PreToolUse gate that does NOT signal a block via stdout JSON. It is a
 * HARD block: it writes a two-line `[enforce-dmi] …` message to STDERR and exits
 * 2 (Claude treats exit 2 as a hard PreToolUse block; any other non-zero is a
 * harness error). This gate therefore returns a richer result than the
 * stdout-block gates: `{ exitCode, stderr }`. The CLI maps it to stderr + the
 * exit code; it NEVER emits a `{"decision":"block"}` line for DMI.
 *
 * SECURITY classification (this unit's contract): a SKILL.md adding
 * side-effecting verbs without `disable-model-invocation: true` is a security
 * gate, so the bash wrapper fails CLOSED on an internal error (Bun-absent →
 * exit 2 for an in-scope SKILL.md write) — see scripts/enforce-dmi.sh.
 *
 * This is the firewall-adjacent wrapper around the pure decision core in
 * [`../../core/dmi-check.ts`](../../core/dmi-check.ts) (checkDmi / dmiDecision):
 * the verb list, the frontmatter DMI-flag check, and the body scan live there;
 * this gate maps the hook input (Write content, else Edit disk-read fallback)
 * and reproduces the two-line stderr message + exit 2 verbatim.
 *
 * No `any`; the HookInput is already narrowed at the boundary.
 */

import { readFileSafe } from "../../core/fs.ts";
import { checkDmi, dmiDecision, DMI_BLOCK_EXIT_CODE } from "../../core/dmi-check.ts";
import type { HookInput } from "../../core/hook-input.ts";

/** The result the DMI gate returns — exit code + the exact stderr lines. */
export interface DmiGateResult {
  /** 2 on a hard block (the enforce-dmi contract), else 0. */
  readonly exitCode: number;
  /** The two-line `[enforce-dmi] …` stderr message on a block; "" otherwise. */
  readonly stderr: string;
}

/** Frozen pass result (exit 0, no stderr). */
const PASS: DmiGateResult = Object.freeze({ exitCode: 0, stderr: "" });

export interface DmiGateOptions {
  /** The parsed, boundary-narrowed hook payload. */
  readonly input: HookInput;
  /**
   * Disk reader for the empty-content Edit fallback; defaults to readFileSafe.
   * Mirrors the bash `if [[ -z "$CONTENT" && -f "$FILE_PATH" ]]; then cat …`.
   */
  readonly readFile?: (absPath: string) => string | null;
}

/**
 * Resolve the candidate content the gate scans: tool_input.content when present;
 * otherwise the file on disk (the bash empty-content Edit fallback). A missing
 * file degrades to "" and the gate passes — exactly the bash behaviour.
 */
function candidateContent(input: HookInput, readFile: (p: string) => string | null): string {
  if (input.content !== "") return input.content;
  if (input.filePath === "") return "";
  return readFile(input.filePath) ?? "";
}

/**
 * The hook-mode DMI gate decision.
 *
 * Returns `{ exitCode: 2, stderr: "[enforce-dmi] BLOCKED: … \n[enforce-dmi]
 * Add 'disable-model-invocation: true' …" }` on a hard block, else PASS. The
 * stderr text reproduces scripts/enforce-dmi.sh:49-50 VERBATIM so the
 * user-facing copy and the exit-2 semantics are preserved.
 */
export function dmiHookGate(opts: DmiGateOptions): DmiGateResult {
  const { input } = opts;
  const readFile = opts.readFile ?? readFileSafe;

  const content = candidateContent(input, readFile);
  const findings = checkDmi(input.filePath, content);
  const decision = dmiDecision(findings, input.filePath);
  if (!decision.blocked) return PASS;

  // Reproduce the two stderr lines the bash hook printed (verbatim wording).
  const line1 = `[enforce-dmi] BLOCKED: ${input.filePath} contains side-effecting verbs but is missing 'disable-model-invocation: true' in frontmatter.`;
  const line2 = `[enforce-dmi] Add 'disable-model-invocation: true' to the SKILL.md frontmatter before this edit.`;
  return Object.freeze({ exitCode: DMI_BLOCK_EXIT_CODE, stderr: `${line1}\n${line2}\n` });
}
