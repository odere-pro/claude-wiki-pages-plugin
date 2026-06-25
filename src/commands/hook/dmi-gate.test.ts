/**
 * Colocated tests for src/commands/hook/dmi-gate.ts — the hook-mode half of
 * scripts/enforce-dmi.sh.
 *
 * Parity target (the bash hook contract, verbatim — the HARD-block gate):
 *   - Non-SKILL.md path → pass (exit 0).
 *   - SKILL.md with no side-effecting verbs → pass.
 *   - SKILL.md with disable-model-invocation: true → pass even with verbs.
 *   - SKILL.md with a side-effecting verb and no DMI flag → BLOCK with exitCode 2
 *     and the two-line [enforce-dmi] stderr message.
 *   - Edit with empty content reads disk content for the scan.
 */

import { describe, test, expect } from "bun:test";
import { dmiHookGate } from "./dmi-gate.ts";
import type { HookInput } from "../../core/hook-input.ts";

const SKILL = "/p/skills/query/SKILL.md";

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

describe("Feature: Hook gates › DMI gate", () => {
  test("non-SKILL.md path → pass (exit 0)", () => {
    const r = dmiHookGate({
      input: input({ filePath: "/p/vault/wiki/x.md", content: "scaffold and commit" }),
    });
    expect(r.exitCode).toBe(0);
    expect(r.stderr).toBe("");
  });

  test("clean SKILL.md → pass", () => {
    const r = dmiHookGate({
      input: input({ filePath: SKILL, content: "---\ntitle: q\n---\n# Q\nReads the vault." }),
    });
    expect(r.exitCode).toBe(0);
  });

  test("SKILL.md with dmi flag → pass despite verbs", () => {
    const r = dmiHookGate({
      input: input({
        filePath: SKILL,
        content: "---\ntitle: q\ndisable-model-invocation: true\n---\nScaffold and commit.",
      }),
    });
    expect(r.exitCode).toBe(0);
  });

  test("SKILL.md with side-effecting verb and no dmi → HARD block (exit 2 + stderr)", () => {
    const r = dmiHookGate({
      input: input({ filePath: SKILL, content: "---\ntitle: q\n---\nScaffold the wiki." }),
    });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("[enforce-dmi]");
    expect(r.stderr).toContain("BLOCKED");
    expect(r.stderr).toContain(SKILL);
    expect(r.stderr).toContain("disable-model-invocation: true");
  });

  test("Edit with empty content reads disk content and blocks", () => {
    const onDisk = "---\ntitle: q\n---\n# Q\nDeploy the results.";
    const r = dmiHookGate({
      input: input({ toolName: "Edit", filePath: SKILL, oldString: "x", newString: "y" }),
      readFile: () => onDisk,
    });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("BLOCKED");
  });

  test("Edit on a clean disk file → pass", () => {
    const onDisk = "---\ntitle: q\n---\n# Q\nReads the vault.";
    const r = dmiHookGate({
      input: input({ toolName: "Edit", filePath: SKILL, oldString: "x", newString: "y" }),
      readFile: () => onDisk,
    });
    expect(r.exitCode).toBe(0);
  });
});
