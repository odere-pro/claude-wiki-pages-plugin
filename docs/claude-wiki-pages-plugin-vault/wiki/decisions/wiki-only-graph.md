---
title: "Wiki-Only Graph"
type: concept
aliases: ["Wiki-Only Graph", "wiki-only graph", "graph exclusions", "Obsidian graph"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0023: Wiki-Only Graph]]", "[[ADR-0022: Folder Notes and Graph Quality]]", "[[ADR-0003: Polish Agent and Obsidian-Side]]", "[[User Guide: Obsidian Experience]]"]
related: ["[[Graph Coloring]]", "[[Graph Config Cache]]", "[[Polish Agent]]", "[[Folder Note]]"]
tags: ["concept", "graph", "obsidian"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Wiki-Only Graph

## Definition

The wiki-only graph is the Obsidian-side contract (ADR-0023): the graph, search, and link autocomplete show only generated `wiki/` pages. `raw/`, `_templates/`, and `_proposed/` are excluded from Obsidian's index via the Excluded files setting.

## Key Principles

- **Excluded files:** `.obsidian/app.json` `userIgnoreFilters: ["raw/", "_templates/", "_proposed/"]` — these paths disappear from the graph, search, and link autocomplete.
- **`output/` stays visible:** user-owned deliverable space, not plugin plumbing.
- **Layer pass dropped (ADR-0023):** the former `path:raw` green / `path:wiki` blue / `path:_templates` orange coloring is removed. Canonical group order is now **topics → specials**.
- **Graph config is regenerable cache:** `.obsidian/graph.json` derives deterministically from the `wiki/` topic tree. `.obsidian/` is gitignored.
- **Polish agent asserts `userIgnoreFilters`** idempotently after every ingest (merge-only: append missing, never remove user entries).

## Examples

- A new top-level topic folder `wiki/retrieval/` → the polish agent adds a color group `path:wiki/retrieval/` to `graph.json`.
- A corrupted `graph.json` → delete it, re-run `/claude-wiki-pages:obsidian-graph-colors` → rebuilt deterministically.

## Related Concepts

- [[Graph Coloring]] — the color group management the polish agent owns
- [[Graph Config Cache]] — why `.obsidian/` is gitignored regenerable cache
- [[Polish Agent]] — asserts the wiki-only contract after every write
- [[Folder Note]] — the pages whose `path:wiki/<topic>` query drives color groups
