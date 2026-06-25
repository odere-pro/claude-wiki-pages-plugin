/**
 * topics.ts — the ONE per-vault topic derivation (universality contract).
 *
 * A vault's "topics" (a.k.a. clusters) are its actual top-level folders under
 * `wiki/`, minus the fixed scaffolding folders that every vault has by schema.
 * Deriving them from the filesystem — rather than hardcoding the plugin's own
 * dogfood folders (`plugin`, `wiki-pages`, `llm`, …) — is what lets the graph
 * machinery work on ANY project, not just this one.
 *
 * Shared by scripts/graph-quality.ts, scripts/strict-tree-reduce.ts, and
 * scripts/heal-orphan-sources.ts so there is a single source of truth for "what
 * are this vault's topics" (no second hardcoded list can drift).
 *
 * Node built-ins only (core dependency rule): no network, no engine imports.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Special (non-topic) wiki subfolders: scaffolding present in every vault by
 * schema, never a project topic. Kept here as the single definition so the
 * topic derivation and any folder-classification agree.
 */
export const SPECIAL_DIRS: ReadonlySet<string> = new Set([
  "_sources",
  "_synthesis",
  "_proposed",
  "_inbox",
  "_templates",
]);

/**
 * The topic folders of a vault, derived from its own `wiki/` tree: every
 * top-level directory that is not scaffolding and not hidden, sorted for
 * determinism. Returns `[]` when `wikiDir` is absent or unreadable.
 *
 * @param wikiDir Absolute path to the vault's `wiki/` directory.
 */
export function deriveTopics(wikiDir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(wikiDir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => {
      if (SPECIAL_DIRS.has(name) || name.startsWith(".")) return false;
      try {
        return statSync(join(wikiDir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}
