import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config, configExit } from "./config.ts";

function projectWith(localModel: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "cwp-cfgcmd-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(join(root, ".claude/claude-wiki-pages.json"), JSON.stringify({ localModel }));
  return root;
}

describe("config command — local-model allow-list (fail-closed)", () => {
  test("enabled + approved model: no localModelErrors, exit 0", () => {
    const root = projectWith({ enabled: true, model: "qwen3-coder:30b" });
    const report = config({ sub: "show", cwd: root });
    expect(report.localModelErrors).toEqual([]);
    expect(configExit(report)).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("enabled + unapproved model: localModelErrors set, exit 1 even on `show`", () => {
    const root = projectWith({ enabled: true, model: "gemma4:31b" });
    const report = config({ sub: "show", cwd: root });
    expect(report.localModelErrors.length).toBeGreaterThan(0);
    expect(report.localModelErrors[0]).toContain("gemma4:31b");
    // Fail-closed on every subcommand, not only `validate`.
    expect(configExit(report)).toBe(1);
    rmSync(root, { recursive: true, force: true });
  });

  test("disabled localModel: never blocks, whatever the model name", () => {
    const root = projectWith({ enabled: false, model: "anything:7b" });
    const report = config({ sub: "show", cwd: root });
    expect(report.localModelErrors).toEqual([]);
    expect(configExit(report)).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });
});
