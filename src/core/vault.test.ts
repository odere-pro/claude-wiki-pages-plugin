import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveVault, DEFAULT_VAULT } from "./vault.ts";

describe("resolveVault four-tier order", () => {
  test("1. env var wins", () => {
    expect(resolveVault({ env: { CLAUDE_WIKI_PAGES_VAULT: "/explicit" } })).toBe("/explicit");
  });

  test("1b. deprecated LLM_WIKI_VAULT honoured as fallback", () => {
    expect(resolveVault({ env: { LLM_WIKI_VAULT: "/legacy" } })).toBe("/legacy");
  });

  test("2. settings file current_vault_path", () => {
    const dir = mkdtempSync(join(tmpdir(), "cwp-vault-"));
    const settings = join(dir, "settings.json");
    writeFileSync(settings, JSON.stringify({ current_vault_path: "my/vault" }));
    expect(resolveVault({ env: {}, settingsFile: settings, cwd: dir })).toBe("my/vault");
    rmSync(dir, { recursive: true, force: true });
  });

  test("3. auto-detect a CLAUDE.md with schema_version + wiki/ sibling", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-detect-"));
    mkdirSync(join(root, "kb", "wiki"), { recursive: true });
    writeFileSync(join(root, "kb", "CLAUDE.md"), "---\nschema_version: 1\n---\n");
    expect(resolveVault({ env: {}, settingsFile: join(root, "none.json"), cwd: root })).toBe("kb");
    rmSync(root, { recursive: true, force: true });
  });

  test("4. default when nothing matches", () => {
    const empty = mkdtempSync(join(tmpdir(), "cwp-empty-"));
    expect(resolveVault({ env: {}, settingsFile: join(empty, "none.json"), cwd: empty })).toBe(
      DEFAULT_VAULT,
    );
    rmSync(empty, { recursive: true, force: true });
  });
});
