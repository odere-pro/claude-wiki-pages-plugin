import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveVault, resolveVaultPath, DEFAULT_VAULT } from "./vault.ts";

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

describe("resolveVaultPath — canonical resolve+normalise helper (H15)", () => {
  test("explicit target bypasses resolution and strips trailing slashes", () => {
    // target provided: resolution skipped entirely
    expect(resolveVaultPath({ target: "my/vault//" })).toBe("my/vault");
  });

  test("explicit target with no trailing slash is returned unchanged", () => {
    expect(resolveVaultPath({ target: "docs/vault" })).toBe("docs/vault");
  });

  test("no target falls back to resolveVault (env tier 1) and strips slashes", () => {
    expect(resolveVaultPath({ env: { CLAUDE_WIKI_PAGES_VAULT: "/from/env/" } })).toBe("/from/env");
  });

  test("no target falls back to resolveVault (settings tier 2) and strips slashes", () => {
    const dir = mkdtempSync(join(tmpdir(), "cwp-rsvp-"));
    const settings = join(dir, "settings.json");
    writeFileSync(settings, JSON.stringify({ current_vault_path: "settings/vault/" }));
    const result = resolveVaultPath({ env: {}, settingsFile: settings, cwd: dir });
    rmSync(dir, { recursive: true, force: true });
    expect(result).toBe("settings/vault");
  });

  test("no target, nothing configured → DEFAULT_VAULT with no trailing slash", () => {
    const empty = mkdtempSync(join(tmpdir(), "cwp-rsvp-empty-"));
    const result = resolveVaultPath({
      env: {},
      settingsFile: join(empty, "none.json"),
      cwd: empty,
    });
    rmSync(empty, { recursive: true, force: true });
    // DEFAULT_VAULT has no trailing slash; normalisation should not corrupt it
    expect(result).toBe(DEFAULT_VAULT);
  });

  test("empty target string is treated as explicit (not undefined) — strips trailing slashes", () => {
    // An explicit empty string means the caller passed '' as --target; strip but preserve.
    expect(resolveVaultPath({ target: "" })).toBe("");
  });

  test("multiple consecutive trailing slashes are all stripped", () => {
    expect(resolveVaultPath({ target: "a/b/c///" })).toBe("a/b/c");
  });
});
