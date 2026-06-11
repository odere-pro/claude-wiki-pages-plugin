import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadConfig,
  validateConfig,
  checkLocalModelApproval,
  APPROVED_LOCAL_MODELS,
  DEFAULT_CONFIG,
  type Config,
} from "./config.ts";

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

describe("checkLocalModelApproval (ADR-0011 / ADR-0017 measured allow-list)", () => {
  const enabled = (model: string): Config => ({
    ...DEFAULT_CONFIG,
    localModel: { ...DEFAULT_CONFIG.localModel, enabled: true, model },
  });

  test("no errors when localModel is disabled (default), whatever the model", () => {
    expect(checkLocalModelApproval(DEFAULT_CONFIG)).toEqual([]);
    const disabledButNamed: Config = {
      ...DEFAULT_CONFIG,
      localModel: { ...DEFAULT_CONFIG.localModel, enabled: false, model: "not-approved:7b" },
    };
    expect(checkLocalModelApproval(disabledButNamed)).toEqual([]);
  });

  test("the measured-pass model is approved", () => {
    expect(APPROVED_LOCAL_MODELS).toContain("qwen3-coder:30b");
    expect(checkLocalModelApproval(enabled("qwen3-coder:30b"))).toEqual([]);
  });

  test("an enabled but unproven model fails closed with a teaching message", () => {
    const errs = checkLocalModelApproval(enabled("gemma4:31b"));
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toContain("gemma4:31b");
    expect(errs[0]).toContain("qwen3-coder:30b"); // names the approved model
    expect(errs[0]).toContain("ADR-0011"); // points at the path to add a model
  });

  test("an enabled localModel with an empty model name fails closed", () => {
    const errs = checkLocalModelApproval(enabled(""));
    expect(errs.length).toBeGreaterThan(0);
  });
});
