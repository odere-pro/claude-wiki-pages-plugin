---
title: "ADR-0023: Wiki-Only Graph"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0023: Wiki-Only Graph

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-13
- **URL:** —

## Summary

ADR-0023 defines the wiki-only graph: the Obsidian graph view shows only topic pages (not sources, synthesis, index, log, or raw files). Two exclusion layers produce this shape: index-level exclusion for bookkeeping artifacts (`raw/`, `_templates/`, `_proposed/`, etc.) and graph-view exclusion for connective scaffolding (`_sources/`, `_synthesis/`, `wiki/index.md`).

## Key Claims

Status: Accepted. Index exclusion (`.obsidian/app.json` → `userIgnoreFilters`) removes raw, templates, proposed, inbox, output, CLAUDE.md, and log from the graph, search, and autocomplete permanently. Graph-view exclusion (`.obsidian/graph.json` → `search`) hides sources, synthesis, and the root MOC from the drawn graph only — they remain searchable and provenance-intact. The result: topic pages render as clean islands. The `vault-example` test fixture was removed (ADR-0029) and replaced by `tests/fixtures/reference-vault`.

Covers: Wiki-Only Graph, Obsidian Graph Exclusions, Topic Islands, Graph View Filters
