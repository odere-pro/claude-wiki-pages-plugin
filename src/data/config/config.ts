/**
 * Configuration loading: defaults ← user ← project ← env overrides, validated
 * against schemas/config.schema.json.
 *
 *   user:    ${CLAUDE_CONFIG_DIR:-~/.config}/claude-wiki-pages/config.json
 *   project: .claude/claude-wiki-pages.json
 *   env:     CLAUDE_WIKI_PAGES_* (explicit leaf overrides — see ENV_MAP)
 */

import { join } from "node:path";
import { readFileSafe, existsSync } from "../../core/fs.ts";

export interface Config {
  readonly vault: { readonly path?: string };
  readonly autoHeal: {
    readonly enabled: boolean;
    readonly aggressiveness: "mechanical" | "structural" | "aggressive";
    readonly maxIterations: number;
  };
  readonly gitCheckpoint: {
    readonly mode: "commit" | "branch" | "both" | "off";
    readonly push: "off" | "auto";
  };
  readonly firewall: {
    readonly enabled: boolean;
    readonly mode: "enforce" | "warn" | "off";
    readonly allowPaths: readonly string[];
    readonly denyPaths: readonly string[];
  };
  readonly maintenance: {
    readonly enabled: boolean;
    readonly autoCatchupOnSessionStart: boolean;
    readonly lintEveryDays: number;
    readonly maxPerRun: number;
    readonly cooldownMinutes: number;
  };
  readonly localModel: {
    readonly enabled: boolean;
    readonly provider: "ollama" | "lmstudio";
    readonly endpoint: string;
    readonly model: string;
    readonly draftTarget: string;
  };
  readonly modelHints: Readonly<Record<string, string>>;
}

export const DEFAULT_CONFIG: Config = {
  vault: {},
  autoHeal: { enabled: true, aggressiveness: "structural", maxIterations: 5 },
  gitCheckpoint: { mode: "commit", push: "off" },
  firewall: {
    enabled: true,
    mode: "enforce",
    allowPaths: [],
    denyPaths: ["**/.ssh/**", "**/.aws/**", "**/.env", "**/.git/config"],
  },
  maintenance: {
    enabled: false,
    autoCatchupOnSessionStart: true,
    lintEveryDays: 7,
    maxPerRun: 10,
    cooldownMinutes: 60,
  },
  localModel: {
    enabled: false,
    provider: "ollama",
    endpoint: "http://localhost:11434",
    model: "",
    draftTarget: "_proposed",
  },
  modelHints: {},
};

type Leaf = readonly [keyof Config, string];
const ENV_MAP: Record<string, Leaf> = {
  CLAUDE_WIKI_PAGES_VAULT_PATH: ["vault", "path"],
  CLAUDE_WIKI_PAGES_AUTOHEAL_ENABLED: ["autoHeal", "enabled"],
  CLAUDE_WIKI_PAGES_AUTOHEAL_AGGRESSIVENESS: ["autoHeal", "aggressiveness"],
  CLAUDE_WIKI_PAGES_AUTOHEAL_MAXITERATIONS: ["autoHeal", "maxIterations"],
  CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE: ["gitCheckpoint", "mode"],
  CLAUDE_WIKI_PAGES_FIREWALL_ENABLED: ["firewall", "enabled"],
  CLAUDE_WIKI_PAGES_FIREWALL_MODE: ["firewall", "mode"],
  CLAUDE_WIKI_PAGES_MAINTENANCE_ENABLED: ["maintenance", "enabled"],
  CLAUDE_WIKI_PAGES_MAINTENANCE_LINTEVERYDAYS: ["maintenance", "lintEveryDays"],
  CLAUDE_WIKI_PAGES_LOCALMODEL_ENABLED: ["localModel", "enabled"],
  CLAUDE_WIKI_PAGES_LOCALMODEL_MODEL: ["localModel", "model"],
};

export interface ConfigPaths {
  readonly user: string;
  readonly project: string;
}

export function configPaths(
  opts: { cwd?: string; env?: Record<string, string | undefined> } = {},
): ConfigPaths {
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;
  const base = env["CLAUDE_CONFIG_DIR"] ?? join(env["HOME"] ?? "~", ".config");
  return {
    user: join(base, "claude-wiki-pages", "config.json"),
    project: join(cwd, ".claude", "claude-wiki-pages.json"),
  };
}

function readJson(path: string): Record<string, unknown> | null {
  const raw = readFileSafe(path);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function deepMerge<T>(base: T, over: Record<string, unknown> | null): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    if (k === "$schema" || k === "version") continue;
    const cur = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object") {
      out[k] = deepMerge(cur, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function coerce(path: string, value: string): unknown {
  if (
    path === "autoHeal.enabled" ||
    path === "firewall.enabled" ||
    path === "maintenance.enabled" ||
    path === "localModel.enabled"
  )
    return value === "true" || value === "1";
  if (path === "autoHeal.maxIterations" || path === "maintenance.lintEveryDays")
    return Number(value);
  return value;
}

function applyEnv(config: Config, env: Record<string, string | undefined>): Config {
  const out = structuredClone(config) as unknown as Record<string, Record<string, unknown>>;
  for (const [envKey, [group, leaf]] of Object.entries(ENV_MAP)) {
    const raw = env[envKey];
    if (raw === undefined) continue;
    out[group] = { ...(out[group] ?? {}), [leaf]: coerce(`${group}.${leaf}`, raw) };
  }
  return out as unknown as Config;
}

export interface EffectiveConfig {
  readonly config: Config;
  readonly paths: ConfigPaths;
  readonly loaded: { readonly user: boolean; readonly project: boolean };
}

export function loadConfig(
  opts: { cwd?: string; env?: Record<string, string | undefined> } = {},
): EffectiveConfig {
  const env = opts.env ?? process.env;
  const paths = configPaths(opts);
  const user = readJson(paths.user);
  const project = readJson(paths.project);
  let config = deepMerge(DEFAULT_CONFIG, user);
  config = deepMerge(config, project);
  config = applyEnv(config, env);
  return {
    config,
    paths,
    loaded: { user: existsSync(paths.user), project: existsSync(paths.project) },
  };
}

/**
 * Models measured to clear the ADR-0011 ingest-extract quality gate, the single
 * source of truth for which local models the plugin will run.
 *
 * This is an ALLOW-LIST, not a recommendation: per ADR-0011 governance, a local
 * model is enabled only after it clears the golden-set bar with committed,
 * `--verify-artifact`-reproducible evidence under `tests/eval/runs/`. To add a
 * model: run `scripts/eval-compare-ollama.sh`, and if it passes both cases,
 * commit its evidence and add its exact `name:tag` here in the same change.
 * Removing a model that later regresses is the reverse of the same edit.
 *
 * Measured 2026-06-11 (Ollama 0.30.7): of six pulled models only qwen3-coder:30b
 * passed — see docs/local-models.md for the full table and per-model reasons.
 */
export const APPROVED_LOCAL_MODELS: readonly string[] = ["qwen3-coder:30b"];

/**
 * Fail-closed approval check for the local-model allow-list. Returns a list of
 * teaching errors (empty = approved). A disabled localModel is always fine —
 * the gate only constrains a local model the plugin would actually run.
 */
export function checkLocalModelApproval(config: Config): string[] {
  if (!config.localModel.enabled) return [];
  const model = config.localModel.model;
  if (APPROVED_LOCAL_MODELS.includes(model)) return [];
  const named = model === "" ? "(none set)" : `"${model}"`;
  return [
    `localModel.model ${named} is not gate-approved. The plugin runs a local ` +
      `model only after it clears the ADR-0011 ingest-extract quality gate with ` +
      `committed evidence. Approved: ${APPROVED_LOCAL_MODELS.join(", ")}. ` +
      `To add a model, run scripts/eval-compare-ollama.sh; if it passes both ` +
      `golden-set cases, commit its tests/eval/runs/ evidence and add it to ` +
      `APPROVED_LOCAL_MODELS (see docs/local-models.md and ADR-0011). ` +
      `Until then, set localModel.enabled: false to keep Claude primary.`,
  ];
}

interface PropSpec {
  readonly enum?: readonly unknown[];
  readonly type?: string;
  readonly properties?: Record<string, PropSpec>;
}

/** Structural validation against the JSON Schema (enum + nested object checks). */
export function validateConfig(config: unknown, schema: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const props = (schema["properties"] as Record<string, PropSpec>) ?? {};
  const walk = (
    obj: Record<string, unknown>,
    spec: Record<string, PropSpec>,
    path: string,
  ): void => {
    for (const [k, v] of Object.entries(obj)) {
      const s = spec[k];
      if (!s) continue;
      if (s.enum && !s.enum.includes(v))
        errors.push(`${path}${k}: "${String(v)}" not in ${s.enum.join("|")}`);
      if (s.type === "object" && s.properties && v && typeof v === "object") {
        walk(v as Record<string, unknown>, s.properties, `${path}${k}.`);
      }
    }
  };
  if (config && typeof config === "object") walk(config as Record<string, unknown>, props, "");
  return errors;
}
