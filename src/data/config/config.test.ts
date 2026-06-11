import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadConfig,
  validateConfig,
  checkLocalModelApproval,
  APPROVED_LOCAL_MODELS,
  APPROVED_LOCAL_MODELS_BY_TIER,
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

describe("localModel.tier + offlinePolicy wiring (ADR-0018)", () => {
  test("defaults are the safest values", () => {
    expect(DEFAULT_CONFIG.localModel.tier).toBe("draft");
    expect(DEFAULT_CONFIG.localModel.offlinePolicy).toBe("off");
  });

  test("project config sets tier and offlinePolicy, survives the merge", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-cfg-"));
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(
      join(root, ".claude/claude-wiki-pages.json"),
      JSON.stringify({ localModel: { tier: "ingest-extract", offlinePolicy: "prefer-local" } }),
    );
    const { config } = loadConfig({ cwd: root, env: { HOME: root } });
    expect(config.localModel.tier).toBe("ingest-extract");
    expect(config.localModel.offlinePolicy).toBe("prefer-local");
    expect(config.localModel.endpoint).toBe("http://localhost:11434"); // untouched key survives
    rmSync(root, { recursive: true, force: true });
  });

  test("env overrides win for tier and offlinePolicy", () => {
    const root = mkdtempSync(join(tmpdir(), "cwp-cfg-"));
    const { config } = loadConfig({
      cwd: root,
      env: {
        HOME: root,
        CLAUDE_WIKI_PAGES_LOCALMODEL_TIER: "ingest-extract",
        CLAUDE_WIKI_PAGES_LOCALMODEL_OFFLINEPOLICY: "strict",
      },
    });
    expect(config.localModel.tier).toBe("ingest-extract");
    expect(config.localModel.offlinePolicy).toBe("strict");
    rmSync(root, { recursive: true, force: true });
  });

  test("validateConfig flags out-of-enum tier and offlinePolicy", () => {
    const schema = {
      properties: {
        localModel: {
          type: "object",
          properties: {
            tier: { enum: ["draft", "ingest-extract"] },
            offlinePolicy: { enum: ["strict", "prefer-local", "off"] },
          },
        },
      },
    };
    const badTier = { ...DEFAULT_CONFIG, localModel: { ...DEFAULT_CONFIG.localModel, tier: "x" } };
    expect(validateConfig(badTier, schema)[0]).toContain("localModel.tier");
    const badPolicy = {
      ...DEFAULT_CONFIG,
      localModel: { ...DEFAULT_CONFIG.localModel, offlinePolicy: "maybe" },
    };
    expect(validateConfig(badPolicy, schema)[0]).toContain("localModel.offlinePolicy");
  });
});

describe("checkLocalModelApproval (ADR-0011 / ADR-0017 / ADR-0018 per-tier allow-list)", () => {
  // The approval helper tests the ingest-extract tier (the one qwen3-coder:30b
  // is gate-approved for); tier defaults to "draft" which is BLOCKED.
  const enabled = (
    model: string,
    tier: Config["localModel"]["tier"] = "ingest-extract",
  ): Config => ({
    ...DEFAULT_CONFIG,
    localModel: { ...DEFAULT_CONFIG.localModel, enabled: true, model, tier },
  });

  test("no errors when localModel is disabled (default), whatever the model", () => {
    expect(checkLocalModelApproval(DEFAULT_CONFIG)).toEqual([]);
    const disabledButNamed: Config = {
      ...DEFAULT_CONFIG,
      localModel: { ...DEFAULT_CONFIG.localModel, enabled: false, model: "not-approved:7b" },
    };
    expect(checkLocalModelApproval(disabledButNamed)).toEqual([]);
  });

  test("the per-tier map keeps the back-compat allow-list as the ingest-extract row", () => {
    expect(APPROVED_LOCAL_MODELS).toContain("qwen3-coder:30b");
    expect(APPROVED_LOCAL_MODELS_BY_TIER["ingest-extract"]).toEqual(APPROVED_LOCAL_MODELS);
    expect(APPROVED_LOCAL_MODELS_BY_TIER["draft"]).toEqual([]);
  });

  test("the query tier exists in the map (ADR-0019)", () => {
    // The row may be empty (BLOCKED) or populated (unlocked by a measured run) —
    // what is pinned is that the tier is wired into the gate at all.
    expect(APPROVED_LOCAL_MODELS_BY_TIER["query"]).toBeDefined();
  });

  test("the measured-pass model is approved for the ingest-extract tier", () => {
    expect(checkLocalModelApproval(enabled("qwen3-coder:30b", "ingest-extract"))).toEqual([]);
  });

  test("a tier with no cleared model is WIRED but BLOCKED, even for an approved model", () => {
    const errs = checkLocalModelApproval(enabled("qwen3-coder:30b", "draft"));
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toContain("draft"); // names the blocked tier
    expect(errs[0]).toContain("ingest-extract"); // points at the unlocked tier
  });

  test("an enabled but unproven model fails closed with a teaching message", () => {
    const errs = checkLocalModelApproval(enabled("gemma4:31b", "ingest-extract"));
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toContain("gemma4:31b");
    expect(errs[0]).toContain("qwen3-coder:30b"); // names the approved model
    expect(errs[0]).toContain("ADR-0011"); // points at the path to add a model
  });

  test("an enabled localModel with an empty model name fails closed", () => {
    const errs = checkLocalModelApproval(enabled("", "ingest-extract"));
    expect(errs.length).toBeGreaterThan(0);
  });
});
