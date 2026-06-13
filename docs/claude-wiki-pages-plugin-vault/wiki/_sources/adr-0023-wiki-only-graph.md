---
title: "ADR-0023: Wiki-Only Graph"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "graph", "obsidian", "schema-v3"]
aliases: ["ADR-0023: Wiki-Only Graph"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0023: Wiki-Only Graph

## Summary

Establishes that the Obsidian graph shows only generated wiki pages. `raw/`, `_templates/`, and `_proposed/` are excluded via `userIgnoreFilters` in `.obsidian/app.json`. The layer pass is dropped. Graph config is declared regenerable cache; `.obsidian/` is gitignored.

## Key Claims

- Excluded files setting: `userIgnoreFilters: ["raw/", "_templates/", "_proposed/"]` in `.obsidian/app.json`.
- The layer pass (coloring `path:raw`, `path:wiki`, `path:_templates`) is dropped everywhere.
- Canonical group order is now topics → specials (`_sources` gray, `_synthesis` yellow).
- `.obsidian/` is gitignored — graph config is regenerable cache, not tracked state.
- `output/` stays visible (user-owned deliverable space, not plugin plumbing).

## Entities Mentioned

- [[Polish Agent]]

## Concepts Covered

- [[Wiki-Only Graph]]
- [[Graph Config Cache]]
- [[Graph Coloring]]

## Grounded Pages

Wiki pages that cite this source:

- [[Wiki-Only Graph]] — exclusions, layer pass dropped, graph config as cache
- [[Plugin Architecture Synthesis]] — graph architecture theme
- [[Polish Agent]] — idempotent userIgnoreFilters assertion
- [[Obsidian Experience]] — graph view exclusions
