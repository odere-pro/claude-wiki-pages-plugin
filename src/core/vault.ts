/**
 * Four-tier vault resolution — faithful port of scripts/resolve-vault.sh.
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
