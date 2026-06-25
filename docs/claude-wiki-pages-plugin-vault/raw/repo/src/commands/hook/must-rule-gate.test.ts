/**
 * Colocated tests for src/commands/hook/must-rule-gate.ts — the hook-mode half
 * of scripts/enforce-must-rule.sh.
 *
 * Parity target (the bash hook contract, verbatim — ADVISORY, exit 0 always):
 *   - Non-CLAUDE.md path → no notice, exit 0.
 *   - CLAUDE.md with no rule words → no notice.
 *   - CLAUDE.md adding must/never/always lines → the two-line stderr notice with
 *     the per-line count; exit 0 (never blocks).
 *   - content preferred over new_string for the scanned text.
 */

import { describe, test, expect } from "bun:test";
import { mustRuleHookGate } from "./must-rule-gate.ts";
import type { HookInput } from "../../core/hook-input.ts";

const CLAUDE = "/p/proj/CLAUDE.md";

function input(over: Partial<HookInput>): HookInput {
  return Object.freeze({
    toolName: "Write",
    filePath: "",
    content: "",
    oldString: "",
    newString: "",
    ...over,
  });
}

describe("mustRuleHookGate", () => {
  test("non-CLAUDE.md path → no notice, exit 0", () => {
    const r = mustRuleHookGate({
      input: input({ filePath: "/p/proj/README.md", content: "You must always do this." }),
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toBe("");
  });

  test("CLAUDE.md with no rule words → no notice", () => {
    const r = mustRuleHookGate({
      input: input({ filePath: CLAUDE, content: "Some descriptive prose here." }),
    });
    expect(r.stderr).toBe("");
  });

  test("CLAUDE.md adding rule lines → two-line notice with count, exit 0", () => {
    const r = mustRuleHookGate({
      input: input({
        filePath: CLAUDE,
        content: "You must do X.\nNever skip Y.\nAlways check Z.",
      }),
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toContain("[enforce-must-rule]");
    expect(r.stderr).toContain("adds 3 imperative");
    expect(r.stderr).toContain("advisory only");
  });

  test("multiple keywords on one line count once", () => {
    const r = mustRuleHookGate({
      input: input({ filePath: CLAUDE, content: "You must never always do this." }),
    });
    expect(r.stderr).toContain("adds 1 imperative");
  });

  test("Edit uses new_string when content empty", () => {
    const r = mustRuleHookGate({
      input: input({ toolName: "Edit", filePath: CLAUDE, newString: "You must do X." }),
    });
    expect(r.stderr).toContain("adds 1 imperative");
  });
});
