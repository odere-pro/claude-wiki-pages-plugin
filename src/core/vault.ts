/**
 * Four-tier vault resolution — faithful port of scripts/resolve-vault.sh.
 *
 * H15 / Architect ruling (intentional hub, stabilised interface):
 *
 *   resolveVault is the SINGLE sanctioned vault-resolution entry point for all
 *   commands. Being imported by 10+ of 14 command modules is an intentional
 *   one-X fan-in, not a coupling smell. The hub is the parity twin of
 *   scripts/resolve-vault.sh (pinned by gate semantics in src/core/CLAUDE.md
 *   "Parity mirrors"). Forking resolution would create a second source of truth.
 *
 *   Surface area is stabilised in two tiers:
 *
 *   1. ResolveOptions — the only tunable knobs (cwd, env, settingsFile).
 *      Callers must NOT call lower-level helpers (readCurrentVaultPath,
 *      autoDetect, findClaudeMds) directly.
 *
 *   2. resolveVaultPath(opts) — the canonical "resolve + normalise" helper
 *      consumed by every command.  It accepts an optional explicit `target`
 *      (the --target CLI flag) and applies the uniform trailing-slash strip.
 *      All 11 command call-sites should migrate to this helper so that any
 *      future change to normalisation lives in exactly one place.
 *
 * Order (first match wins):
 *   1. CLAUDE_WIKI_PAGES_VAULT env var   (LLM_WIKI_VAULT honoured as a deprecated fallback)
 *   2. .claude/claude-wiki-pages/settings.json  → current_vault_path
 *   3. Auto-detect: a CLAUDE.md (≤4 levels) declaring schema_version with a wiki/ sibling
 *   4. Default: docs/vault
 */

import { readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { readFileSafe, existsSync } from "./fs.ts";

export const DEFAULT_VAULT = "docs/vault";
const DEFAULT_SETTINGS = ".claude/claude-wiki-pages/settings.json";
const MAX_DETECT_DEPTH = 4;

export interface ResolveOptions {
  readonly cwd?: string;
  readonly env?: Record<string, string | undefined>;
  /** Override the settings file path (used by tests; mirrors CLAUDE_WIKI_PAGES_SETTINGS_FILE). */
  readonly settingsFile?: string;
}

export function resolveVault(opts: ResolveOptions = {}): string {
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;

  // 1. Explicit env override (new name, then deprecated old name).
  const envVault = env["CLAUDE_WIKI_PAGES_VAULT"] || env["LLM_WIKI_VAULT"];
  if (envVault) return envVault;

  // 2. Persistent settings file.
  const settingsFile =
    opts.settingsFile ?? env["CLAUDE_WIKI_PAGES_SETTINGS_FILE"] ?? join(cwd, DEFAULT_SETTINGS);
  const fromSettings = readCurrentVaultPath(settingsFile);
  if (fromSettings) return fromSettings;

  // 3. Auto-detect a vault by its two signals: schema_version marker + wiki/ sibling.
  const detected = autoDetect(cwd);
  if (detected) return detected;

  // 4. Default.
  return DEFAULT_VAULT;
}

/**
 * Canonical "resolve + normalise" entry point for command handlers.
 *
 * This is the preferred call site for all 11 command modules that currently
 * inline `(opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "")`.
 * Centralising the trailing-slash strip here means future normalisation changes
 * (e.g. path.resolve, symlink expansion) are a one-line edit in this file, not
 * a search-and-replace across the command tree.
 *
 * Usage:
 *   const vault = resolveVaultPath({ cwd: opts.cwd, target: opts.target });
 *
 * @param params.target  - If present, used verbatim (the --target CLI flag);
 *                         resolution is skipped.
 * @param params.cwd     - Working directory for resolution (default: process.cwd()).
 * @param params.env     - Environment map (default: process.env).
 * @param params.settingsFile - Override the settings file path (used in tests).
 */
export function resolveVaultPath(
  params: ResolveOptions & { readonly target?: string } = {},
): string {
  const raw = params.target ?? resolveVault(params);
  return raw.replace(/\/+$/, "");
}

function readCurrentVaultPath(settingsFile: string): string | null {
  const content = readFileSafe(settingsFile);
  if (content === null) return null;
  const m = content.match(/"current_vault_path"\s*:\s*"([^"]*)"/);
  return m && m[1] ? m[1] : null;
}

function autoDetect(cwd: string): string | null {
  const candidates = findClaudeMds(cwd, MAX_DETECT_DEPTH).sort();
  for (const claudeMd of candidates) {
    const content = readFileSafe(claudeMd);
    const dir = dirname(claudeMd);
    if (content && content.includes("schema_version") && existsSync(join(dir, "wiki"))) {
      // Return a path relative to cwd when possible, matching the bash `find .` output shape.
      const rel = relative(cwd, dir);
      return rel === "" ? "." : rel;
    }
  }
  return null;
}

/** Collect CLAUDE.md paths up to `maxDepth` directories below `root`. */
function findClaudeMds(root: string, maxDepth: number): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isFile() && name === "CLAUDE.md") out.push(full);
      else if (st.isDirectory() && name !== ".git" && name !== "node_modules" && depth < maxDepth) {
        walk(full, depth + 1);
      }
    }
  };
  walk(root, 1);
  return out;
}
