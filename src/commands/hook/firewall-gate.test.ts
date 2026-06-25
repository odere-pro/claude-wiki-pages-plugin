/**
 * Colocated tests for src/commands/hook/firewall-gate.ts — the hook-mode
 * decision logic that scripts/firewall.sh ran inline (lines 347-370), now in the
 * engine. firewall-twin-retire (migration-plan.md Phase 3).
 *
 * Parity target (the bash hook-mode contract, verbatim):
 *   1. Empty file_path → allow (the bash `[ -z "$FILE_PATH" ] && exit 0`).
 *   2. enforce block (vault boundary / deny / cross-vault / outside) → block with
 *      the B03-redacted reason (vault basename only, never the absolute path).
 *   3. cross-vault uses the dedicated "different registered vault" message; every
 *      other block uses the "confined to the vault … add to allowPaths" message.
 *   4. warn mode advises on stderr (caller) and never blocks.
 *   5. allow (inside vault / off / disabled) → no block.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeVault, type Sandbox } from "../../test-helpers/sandbox/vault.ts";
import { firewallHookGate } from "./firewall-gate.ts";

/** Write a project config under <root>/.claude/claude-wiki-pages.json. */
function writeProjectConfig(root: string, json: string): void {
  const dir = join(root, ".claude");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "claude-wiki-pages.json"), json);
}

let sb: Sandbox | undefined;
afterEach(() => {
  sb?.cleanup();
  sb = undefined;
});

describe("Feature: Hook gates › firewall gate", () => {
  test("empty file path → allow", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const d = firewallHookGate({ vault: sb.vault, input: emptyInput() });
    expect(d.block).toBe(false);
  });

  test("a write inside the vault is allowed (no block)", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const d = firewallHookGate({
      vault: sb.vault,
      input: write(`${sb.vault}/wiki/topics/page.md`),
    });
    expect(d.block).toBe(false);
  });

  test("a write outside the vault is blocked with a redacted reason", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const d = firewallHookGate({
      vault: sb.vault,
      input: write("/tmp/elsewhere/secret.md"),
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("confined to the vault");
    expect(d.reason).toContain(`${basename(sb.vault)}/`);
    // B03: never leak the absolute vault path.
    expect(d.reason).not.toContain(sb.vault);
  });

  test("a deny glob inside the vault is blocked", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const d = firewallHookGate({ vault: sb.vault, input: write(`${sb.vault}/.env`) });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("Blocked by deny:");
  });

  test("a sibling registered vault is blocked as cross-vault with the dedicated message", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    const sibling = `${sb.vault}-sibling`;
    const d = firewallHookGate({
      vault: sb.vault,
      input: write(`${sibling}/wiki/page.md`),
      otherVaults: [sibling],
    });
    expect(d.block).toBe(true);
    expect(d.reason).toContain("cross-vault");
    expect(d.reason).toContain("different registered vault");
  });

  test("warn mode never blocks", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    writeProjectConfig(sb.root, '{"firewall":{"mode":"warn"}}');
    const d = firewallHookGate({
      vault: sb.vault,
      input: write("/etc/passwd"),
      cwd: sb.root,
    });
    expect(d.block).toBe(false);
  });

  test("mode off is a pass-through", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n" });
    writeProjectConfig(sb.root, '{"firewall":{"mode":"off"}}');
    const d = firewallHookGate({
      vault: sb.vault,
      input: write("/etc/passwd"),
      cwd: sb.root,
    });
    expect(d.block).toBe(false);
  });
});

// ── helpers ──────────────────────────────────────────────────────────────────

function basename(p: string): string {
  return p.split("/").pop() as string;
}

function emptyInput() {
  return Object.freeze({
    toolName: "Write",
    filePath: "",
    content: "",
    oldString: "",
    newString: "",
  });
}

function write(filePath: string) {
  return Object.freeze({
    toolName: "Write",
    filePath,
    content: "x",
    oldString: "",
    newString: "",
  });
}
