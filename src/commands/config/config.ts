/**
 * `config` — show the effective configuration (defaults ← user ← project ← env)
 * or validate it against schemas/config.schema.json.
 *
 *   config            → print the effective config + where each layer is read from
 *   config validate   → validate; exit 1 with the list of problems
 *   config path       → print the user/project config file paths
 */

import { join } from "node:path";
import { readFileSafe } from "../../core/fs.ts";
import {
  loadConfig,
  validateConfig,
  type Config,
  type ConfigPaths,
} from "../../data/config/config.ts";

export type ConfigSub = "show" | "validate" | "path";

export interface ConfigReport {
  readonly command: "config";
  readonly sub: ConfigSub;
  readonly paths: ConfigPaths;
  readonly loaded: { readonly user: boolean; readonly project: boolean };
  readonly config: Config;
  readonly errors: readonly string[];
}

export interface ConfigOptions {
  readonly sub?: ConfigSub;
  readonly cwd?: string;
  readonly pluginRoot?: string;
}

export function config(opts: ConfigOptions = {}): ConfigReport {
  const sub = opts.sub ?? "show";
  const pluginRoot = opts.pluginRoot ?? opts.cwd ?? process.cwd();
  const { config: cfg, paths, loaded } = loadConfig({ cwd: opts.cwd });

  let errors: string[] = [];
  if (sub === "validate") {
    const schemaRaw = readFileSafe(join(pluginRoot, "schemas/config.schema.json"));
    if (schemaRaw === null) {
      errors = ["schemas/config.schema.json not found (run from the plugin repo)"];
    } else {
      try {
        errors = validateConfig(cfg, JSON.parse(schemaRaw) as Record<string, unknown>);
      } catch {
        errors = ["schemas/config.schema.json is not valid JSON"];
      }
    }
  }

  return { command: "config", sub, paths, loaded, config: cfg, errors };
}

/** Exit code: 1 when `config validate` found problems, else 0. */
export function configExit(report: ConfigReport): number {
  return report.sub === "validate" && report.errors.length > 0 ? 1 : 0;
}
