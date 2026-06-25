/**
 * Colocated tests for src/commands/hook/protect-raw-gate.ts — the hook-mode half
 * of scripts/protect-raw.sh.
 *
 * Parity target (the bash hook contract, verbatim):
 *   - Empty file_path → allow.
 *   - Edit to any raw/ file → block ("immutable").
 *   - Write overwriting an existing raw/ file → block ("Cannot overwrite").
 *   - Write of a NEW file directly under raw/ → allow (new human source).
 *   - agent-session carve-out: Write of a NEW raw/agent-sessions/ file with a
 *     frontmatter source_type: agent-session marker → allow; without it → block.
 *   - Non-raw path → allow.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { makeVault, type Sandbox } from "../../test-helpers/sandbox/vault.ts";
import { protectRawHookGate } from "./protect-raw-gate.ts";
import type { HookInput } from "../../core/hook-input.ts";

/** The vault basename the segment-glob boundary keys off (the bash $VAULT_NAME). */
function vname(vault: string): string {
  return basename(vault);
}

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

let sb: Sandbox | undefined;
afterEach(() => {
  sb?.cleanup();
  sb = undefined;
});

const AGENT_SESSION_FM = "---\ntype: source\nsource_type: agent-session\n---\nbody\n";

describe("Feature: Hook gates › raw-immutability gate", () => {
  test("empty file_path → allow", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({ filePath: "" }),
    });
    expect(d.block).toBe(false);
  });

  test("non-raw path → allow", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({ filePath: `${sb.vault}/wiki/topics/x.md`, content: "x" }),
    });
    expect(d.block).toBe(false);
  });

  test("Edit to a raw/ file → block (immutable)", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({ toolName: "Edit", filePath: `${sb.vault}/raw/paper.md` }),
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("immutable");
  });

  test("Write overwriting an existing raw/ file → block (Cannot overwrite)", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    mkdirSync(join(sb.vault, "raw"), { recursive: true });
    writeFileSync(join(sb.vault, "raw", "paper.md"), "pre-existing\n");
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({ filePath: `${sb.vault}/raw/paper.md`, content: "overwrite" }),
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("Cannot overwrite");
  });

  test("Write of a NEW raw/ file → allow (new human source)", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    mkdirSync(join(sb.vault, "raw"), { recursive: true });
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({ filePath: `${sb.vault}/raw/new-src.md`, content: "new" }),
    });
    expect(d.block).toBe(false);
  });

  test("carve-out: NEW raw/agent-sessions/ file WITH frontmatter marker → allow", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    mkdirSync(join(sb.vault, "raw", "agent-sessions"), { recursive: true });
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({
        filePath: `${sb.vault}/raw/agent-sessions/sess-1.md`,
        content: AGENT_SESSION_FM,
      }),
    });
    expect(d.block).toBe(false);
  });

  test("carve-out: NEW raw/agent-sessions/ file WITHOUT marker → block", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    mkdirSync(join(sb.vault, "raw", "agent-sessions"), { recursive: true });
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({
        filePath: `${sb.vault}/raw/agent-sessions/sess-2.md`,
        content: "---\ntype: source\n---\nbody\n",
      }),
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("source_type: agent-session");
  });

  test("carve-out smuggle: body-only marker → block", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    mkdirSync(join(sb.vault, "raw", "agent-sessions"), { recursive: true });
    const d = protectRawHookGate({
      vault: sb.vault,
      vaultName: vname(sb.vault),
      input: input({
        filePath: `${sb.vault}/raw/agent-sessions/sess-3.md`,
        content: "---\ntype: source\nsource_type: paper\n---\nsource_type: agent-session\n",
      }),
    });
    expect(d.block).toBe(true);
  });
});
