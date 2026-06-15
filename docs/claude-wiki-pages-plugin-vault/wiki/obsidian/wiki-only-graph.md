---
title: "Wiki-Only Graph"
type: concept
aliases: ["Wiki-Only Graph", "wiki-only graph", "graph exclusions", "Obsidian graph"]
parent: "[[Obsidian]]"
path: "obsidian"
sources: ["[[ADR-0023: Wiki-Only Graph]]", "[[ADR-0022: Folder Notes and Graph Quality]]", "[[ADR-0003: Polish Agent and Obsidian-Side Experience]]", "[[User Guide: Obsidian Experience]]", "[[Glossary]]"]
related: ["[[Graph Coloring]]", "[[Graph Config Cache]]", "[[Polish Agent]]", "[[Folder Note]]", "[[Obsidian Experience]]"]
tags: ["concept", "graph", "obsidian"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Wiki-Only Graph

> [!summary]
> The wiki-only graph is the Obsidian-side contract (ADR-0023): the graph, search, and link autocomplete show only generated `wiki/` pages. `raw/`, `_templates/`, and `_proposed/` are excluded from Obsidian's index via the Excluded files setting in `.obsidian/app.json`. Graph config is regenerable cache — `.obsidian/` is entirely gitignored.

## Key Principles

- Exclusion via `userIgnoreFilters` is stronger than graph-side filtering: excluded paths disappear from graph, search, autocomplete, and the `path:` dropdown — not just the graph.
- The layer pass (ADR-0022's `path:raw`, `path:wiki`, `path:_templates` groups) was dropped in ADR-0023 because with exclusions active, those groups can never match.
- `output/` is intentionally not excluded: it is user-owned deliverable space, not plugin plumbing.
- `.obsidian/` is entirely gitignored; graph config is regenerable cache, not tracked state.
- The polish agent re-asserts `userIgnoreFilters` idempotently (merge-only: never removes user entries).

## Examples

The excluded files list in `.obsidian/app.json`:

```json
{
  "userIgnoreFilters": ["raw/", "_templates/", "_proposed/"]
}
```

Rebuilding after a lost `.obsidian/graph.json`:

```bash
/claude-wiki-pages:obsidian-graph-colors
```

What a user sees after the wiki-only contract is applied:
- Graph shows topic clusters color-coded by folder, `_sources` in gray, `_synthesis` in yellow.
- Search returns only `wiki/` pages — no raw source files, no templates.
- Link autocomplete suggests only wiki page titles, not filenames in `raw/`.

## Definition

The wiki-only graph contract ensures that when a user opens the vault in Obsidian, the graph view, search, and link autocomplete surface only the generated knowledge pages in `wiki/` — not the raw sources, scaffolding templates, or proposed drafts. This was introduced by ADR-0023, which superseded the earlier "layer pass" coloring approach from ADR-0022.

## Why This Decision Was Made (ADR-0023 Context)

The previous approach (ADR-0022 §4) colored `path:raw` green, `path:wiki` blue, and `path:_templates` orange — but this put the _plumbing_ on the map. The graph view surfaced `raw/adr`, `raw/assets`, `raw/design`, and `_templates` alongside the knowledge pages. The dogfooding experience confirmed it: the user's first reaction to the live vault's graph was that the plugin had "added artifacts and raw files" to the wiki view.

A second friction: the plugin treated `.obsidian/` filters and color groups as state to maintain incrementally, when every value in them is derivable from the `wiki/` topic tree. Hand-repair of a clobbered `graph.json` is wasted effort.

## The Three Decisions (ADR-0023)

### 1. Exclude via Obsidian's Excluded Files Setting

```json
// .obsidian/app.json
{ "userIgnoreFilters": ["raw/", "_templates/", "_proposed/"] }
```

Excluded paths disappear from the graph, search, and link autocomplete — not just from the graph filter. This is stronger than a graph-side filter (`search: "-path:raw"`), which would leave raw files in search, quick switcher, link autocomplete, and the `path:` group dropdown. `output/` stays visible: it is user-owned deliverable space, not plugin plumbing.

### 2. Layer Pass Dropped

ADR-0022's third color tier (`path:raw` green, `path:wiki` blue, `path:_templates` orange) is removed everywhere. With raw and templates excluded from the Obsidian index, groups matching them are dead weight. The canonical group order becomes **topics → specials** (`_sources` gray, `_synthesis` yellow). Color groups query `path:wiki/...` exclusively.

### 3. Graph Config is Regenerable Cache

`.obsidian/graph.json` and the plugin-owned `app.json` keys are declared **cache, not state**: every value derives deterministically from the `wiki/` topic tree plus the skill's palette table. The entire `.obsidian/` directory is gitignored. A fresh or emptied `.obsidian/` is rebuilt on the next skill run or polish pass:

```bash
/claude-wiki-pages:obsidian-graph-colors
```

## Consequences

- The graph, search, and autocomplete show knowledge pages only; provenance stays on disk and in git, reachable through `_sources/` summaries.
- `attachment_path` targets under `raw/assets/` are excluded from Obsidian's index; embeds still render, but provenance payload is reviewed in the editor/filesystem, not the graph.
- A user who wants raw nodes visible can remove the `userIgnoreFilters` entries in their own vault — the polish agent re-adds them idempotently (merge-only: never removes user entries).

## Alternatives Considered

- **Graph-side filter only.** Cleans the graph but leaves raw files in search, quick switcher, and link autocomplete — the surfaces the user actually noticed.
- **Keep the layer pass, ordered after exclusions.** Incoherent: a color group for a path the index no longer contains can never match.
- **Move `raw/` outside the Obsidian vault root.** Breaks the single-vault data-layer contract, every relative `attachment_path`, and the resolver.

## Related Concepts

- [[Graph Coloring]] — the color group management the polish agent owns
- [[Graph Config Cache]] — why `.obsidian/` is gitignored regenerable cache
- [[Polish Agent]] — asserts the wiki-only contract idempotently after every write
- [[Folder Note]] — the pages whose `path:wiki/<topic>` query drives color groups
- [[Obsidian Experience]] — user guide for the Obsidian-side experience
