#!/usr/bin/env bun
/**
 * apply-obsidian-config.ts — deterministic, idempotent writer for a vault's
 * `.obsidian/graph.json` and `.obsidian/app.json`.
 *
 * Why this exists (ADR-0035). The polish agent used to apply the Obsidian graph
 * configuration through prose steps that wrote the island/search FILTER scaffold
 * (the `search` exclusion, `showTags:false`, `hideUnresolved:true`) ONLY when
 * `graph.json` was absent. But Obsidian writes its own `graph.json` — with the
 * harmful defaults `search:""`, `hideUnresolved:false`, `showTags:true` — the
 * moment a user opens the graph view. On every run after that, the prose path
 * took the "file exists, patch colorGroups only" branch and left those defaults
 * in place. The observable result: `raw/` and `wiki/_sources/` drawn as a large
 * disconnected gray sprawl, tag nodes doubling every page, and dangling links
 * rendered as gray ghost nodes. `app.json` `userIgnoreFilters` was likewise
 * asserted only in prose and routinely never landed, so the same scaffolding
 * leaked into search and link autocomplete too.
 *
 * This script replaces that fragile prose with one deterministic, merge-only
 * pass. It ALWAYS asserts the filter keys and the exclusion list — never just on
 * first run — so a re-run converges to the intended topic-island graph no matter
 * what Obsidian left behind. Existing `colorGroups` are preserved; a group is
 * appended only for a topic folder that lacks one, so the user's chosen colors
 * are never churned.
 *
 * Scope: writes only inside `<vault>/.obsidian/`. Idempotent — a second run on
 * an already-correct vault writes nothing and reports `unchanged`. Read-only
 * everywhere else. Exit 0 on success; exit 1 only on an unwritable vault.
 *
 * Usage: apply-obsidian-config.ts --target <vault> [--json] [--check]
 *   --check   report drift without writing (exit 0 = in sync, exit 3 = drift)
 */

import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

// The island/search filter base (ADR-0033 / ADR-0036): excludes the connective
// scaffolding so the graph renders as topic islands rather than one hairball
// fused through shared sources and the MOC. The pages stay in the vault — they
// are just not drawn. Kept byte-identical to the obsidian-graph-colors skill's
// documented scaffold so the two never drift.
// NOTE: wiki/index.md is deliberately NOT excluded — it is the ROOT hub node,
// drawn and distinctly coloured so every island visibly hangs off one findable
// entry point (the "there must always be a ROOT" requirement). Only the
// bookkeeping log and the scaffolding folders are hidden.
// Cross-cutting folders (ADR-0036) are appended by buildIslandFilter() below.
const ISLAND_FILTER_BASE =
  '-path:"raw/" -path:"_templates/" -path:"_proposed/" -path:"_inbox/" ' +
  '-path:"output/" -path:"wiki/_sources/" -path:"wiki/_synthesis/" ' +
  '-path:"wiki/log.md"';

/**
 * Build the full island search filter by appending `-path:"wiki/<folder>/"` for
 * each cross-cutting folder (ADR-0036). Cross-cutting folders (e.g. `principles`)
 * over-connect the graph because they contain pages referenced from every topic;
 * excluding them from the graph view recovers topic-island separation without
 * removing the pages from the vault.
 *
 * Set via env var `CLAUDE_WIKI_PAGES_CROSS_CUTTING` (comma-separated folder
 * names under `wiki/`). Default: `"principles"`. Pass `""` to disable.
 */
function buildIslandFilter(crossCutting: readonly string[]): string {
  let filter = ISLAND_FILTER_BASE;
  for (const folder of crossCutting) {
    if (folder) filter += ` -path:"wiki/${folder}/"`;
  }
  return filter;
}

// The ROOT hub group: index.md gets its own distinct colour so it stands out as
// the entry point among the per-topic island colours. Asserted on every run.
const ROOT_QUERY = "path:wiki/index.md";
const ROOT_COLOR = { a: 1, rgb: 16777215 }; // bright white — distinct from PALETTE

// The non-search graph view filters this script enforces every run (merge-only —
// all other keys, including the force-simulation params and `scale`, are
// preserved). The `search` key is computed dynamically by buildIslandFilter()
// so cross-cutting folders are included.
const GRAPH_FILTER_KEYS: Record<string, string | boolean> = {
  showTags: false,
  showAttachments: false,
  hideUnresolved: true,
  showOrphans: true,
};

// Obsidian "Excluded files" — index-level, robust (unlike the per-file tokens in
// the graph `search` filter). Bookkeeping artifacts disappear from graph,
// search, and link autocomplete.
const USER_IGNORE_FILTERS = [
  "raw/",
  "_templates/",
  "_proposed/",
  "_inbox/",
  "output/",
  "CLAUDE.md",
  "wiki/log.md",
];

// New-file routing keys: stub notes Obsidian creates land in the _inbox
// quarantine (so an exact-filename match never shadows a real wiki page), and
// links are written in shortest (basename) form.
const APP_KEYS: Record<string, string> = {
  newFileLocation: "folder",
  newFileFolderPath: "_inbox",
  newLinkFormat: "shortest",
};

// Per-topic palette (decimal RGB), mirrors the obsidian-graph-colors skill.
// Applied in topic-folder sort order; only ever appended, never reassigned.
const PALETTE = [
  3447003, 16750848, 10494192, 5763719, 15158332, 16776960, 1751452, 15277667, 16734498, 48340,
  9159498, 16750592, 10233776, 6323595,
];

const NON_TOPIC_DIRS = new Set(["_sources", "_synthesis", "_templates"]);

type Json = Record<string, unknown>;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

function loadJson(path: string): Json {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Json) : {};
  } catch {
    // Corrupt/partial config is regenerable cache (ADR-0023): rebuild from the
    // scaffold rather than failing the run.
    return {};
  }
}

/** Top-level topic folders under wiki/ (sorted; scaffolding excluded). */
function topicFolders(wiki: string): string[] {
  if (!existsSync(wiki)) return [];
  return readdirSync(wiki, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !NON_TOPIC_DIRS.has(d.name))
    .map((d) => d.name)
    .sort();
}

/** Preserve existing color groups; append one per topic folder lacking a group. */
function reconcileColorGroups(
  existing: unknown,
  topics: string[],
): {
  groups: unknown[];
  added: number;
} {
  const groups = Array.isArray(existing) ? [...existing] : [];
  const have = new Set(
    groups.map((g) => (g as Json)?.query).filter((q): q is string => typeof q === "string"),
  );
  let added = 0;
  // The ROOT hub group first, so index.md is always distinctly coloured.
  if (!have.has(ROOT_QUERY)) {
    groups.push({ query: ROOT_QUERY, color: ROOT_COLOR });
    have.add(ROOT_QUERY);
    added += 1;
  }
  for (const topic of topics) {
    const query = `path:wiki/${topic}`;
    if (have.has(query)) continue;
    // groups.length grows as we push, so it is the running color index.
    const rgb = PALETTE[groups.length % PALETTE.length]!;
    groups.push({ query, color: { a: 1, rgb } });
    added += 1;
  }
  return { groups, added };
}

/** Merge graph filter keys + colorGroups into graph config. Returns [next, changed]. */
function reconcileGraph(graph: Json, topics: string[], islandFilter: string): [Json, string[]] {
  const next: Json = { ...graph };
  const changed: string[] = [];
  // Apply the dynamic search filter first, then the static boolean keys.
  const allFilters: Record<string, string | boolean> = {
    search: islandFilter,
    ...GRAPH_FILTER_KEYS,
  };
  for (const [key, value] of Object.entries(allFilters)) {
    if (next[key] !== value) {
      next[key] = value;
      changed.push(key);
    }
  }
  const { groups, added } = reconcileColorGroups(graph.colorGroups, topics);
  if (added > 0) {
    next.colorGroups = groups;
    next["collapse-color-groups"] = false;
    changed.push(`colorGroups+${added}`);
  } else if (!Array.isArray(graph.colorGroups)) {
    next.colorGroups = groups;
    changed.push("colorGroups");
  }
  return [next, changed];
}

/** Merge userIgnoreFilters (append-only) + new-file keys into app config. */
function reconcileApp(app: Json, crossCutting: readonly string[]): [Json, string[]] {
  const next: Json = { ...app };
  const changed: string[] = [];
  const have = Array.isArray(app.userIgnoreFilters)
    ? (app.userIgnoreFilters as unknown[]).filter((e): e is string => typeof e === "string")
    : [];
  const merged = [...have];
  // Base exclusions.
  for (const entry of USER_IGNORE_FILTERS) {
    if (!merged.includes(entry)) merged.push(entry);
  }
  // Cross-cutting folder exclusions (ADR-0036): e.g. "wiki/principles/" so that
  // folder disappears from graph, search, and link autocomplete index-wide.
  for (const folder of crossCutting) {
    const entry = `wiki/${folder}/`;
    if (folder && !merged.includes(entry)) merged.push(entry);
  }
  if (merged.length !== have.length || !Array.isArray(app.userIgnoreFilters)) {
    next.userIgnoreFilters = merged;
    changed.push(`userIgnoreFilters+${merged.length - have.length}`);
  }
  for (const [key, value] of Object.entries(APP_KEYS)) {
    if (next[key] !== value) {
      next[key] = value;
      changed.push(key);
    }
  }
  return [next, changed];
}

function main(): void {
  const target = arg("--target") ?? process.env.CLAUDE_WIKI_PAGES_VAULT ?? ".";
  const asJson = hasFlag("--json");
  const checkOnly = hasFlag("--check");
  const obsidian = join(target, ".obsidian");
  const graphPath = join(obsidian, "graph.json");
  const appPath = join(obsidian, "app.json");
  const wiki = join(target, "wiki");

  // Cross-cutting folders (ADR-0036): comma-separated folder names under wiki/.
  // E.g. "principles,cross-cutting". Pass "" to disable. Default: "principles".
  const crossCuttingRaw = process.env.CLAUDE_WIKI_PAGES_CROSS_CUTTING ?? "principles";
  const crossCuttingFolders = crossCuttingRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const islandFilter = buildIslandFilter(crossCuttingFolders);

  const topics = topicFolders(wiki);
  const [graphNext, graphChanged] = reconcileGraph(loadJson(graphPath), topics, islandFilter);
  const [appNext, appChanged] = reconcileApp(loadJson(appPath), crossCuttingFolders);
  const drift = graphChanged.length > 0 || appChanged.length > 0;

  if (!checkOnly && drift) {
    if (!existsSync(obsidian)) mkdirSync(obsidian, { recursive: true });
    if (graphChanged.length > 0)
      writeFileSync(graphPath, JSON.stringify(graphNext, null, 2) + "\n");
    if (appChanged.length > 0) writeFileSync(appPath, JSON.stringify(appNext, null, 2) + "\n");
  }

  const result = {
    command: "apply-obsidian-config",
    vault: target,
    mode: checkOnly ? "check" : "write",
    topics,
    crossCuttingFolders,
    graph: graphChanged.length ? graphChanged : "unchanged",
    app: appChanged.length ? appChanged : "unchanged",
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const verb = checkOnly ? "drift" : "wrote";
    process.stdout.write(
      `apply-obsidian-config (${result.mode}): ` +
        `graph[${graphChanged.length ? `${verb}: ${graphChanged.join(", ")}` : "unchanged"}] ` +
        `app[${appChanged.length ? `${verb}: ${appChanged.join(", ")}` : "unchanged"}]\n`,
    );
  }

  // --check exits 3 on drift (gate signal); write mode always exits 0.
  if (checkOnly && drift) process.exit(3);
}

main();
