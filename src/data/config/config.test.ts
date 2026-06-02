import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, validateConfig, DEFAULT_CONFIG } from "./config.ts";

describe("loadConfig", () => {
  test("returns defaults when nothing is configured", () => {
    const empty = mkdtempSync(join(tmpdir(), "cwp-cfg-"));
    const { config } = loadConfig({ cwd: empty, env: { HOME: empty } });
    expect(config.autoHeal.aggressiveness).toBe("structural");
    expect(config.gitCheckpoint.mode).toBe("commit");
    rmSync(empty, { recursive: true, force: true });
  });

  test("project config overrides defaults", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-cfg-"));
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(
      join(root, ".claude/claude-wiki-pages.json"),
      JSON.stringify({ autoHeal: { maxIterations: 9 } }),
    );
    const { config } = loadConfig({ cwd: root, env: { HOME: root } });
    expect(config.autoHeal.maxIterations).toBe(9);
    expect(config.autoHeal.aggressiveness).toBe("structural"); // untouched key survives merge
    rmSync(root, { recursive: true, force: true });
  });

  test("env overrides win over files, with coercion", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-cfg-"));
    const { config } = loadConfig({
      cwd: root,
      env: {
        HOME: root,
        CLAUDE_WIKI_PAGES_AUTOHEAL_ENABLED: "false",
        CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE: "branch",
      },
    });
    expect(config.autoHeal.enabled).toBe(false);
    expect(config.gitCheckpoint.mode).toBe("branch");
    rmSync(root, { recursive: true, force: true });
  });
});

describe("validateConfig", () => {
  const schema = {
    properties: {
      autoHeal: {
        type: "object",
        properties: { aggressiveness: { enum: ["mechanical", "structural", "aggressive"] } },
      },
      gitCheckpoint: {
        type: "object",
        properties: { mode: { enum: ["commit", "branch", "both", "off"] } },
      },
    },
  };
  test("passes the default config", () => {
    expect(validateConfig(DEFAULT_CONFIG, schema)).toEqual([]);
  });
  test("flags an out-of-enum value", () => {
    const bad = { ...DEFAULT_CONFIG, gitCheckpoint: { mode: "nope" } };
    expect(validateConfig(bad, schema)[0]).toContain("gitCheckpoint.mode");
  });
});
