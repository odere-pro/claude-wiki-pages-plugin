---
title: "ADR-0023: Wiki-Only Graph"
type: entity
entity_type: standard
aliases: ["ADR-0023", "adr-0023", "wiki only graph ADR", "topic island graph"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0023|ADR-0023: Wiki-Only Graph]]"]
related: []
tags: ["docs", "adrs", "obsidian", "graph"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0023: Wiki-Only Graph

Defines the wiki-only graph shape: Obsidian's graph view renders only topic pages as clean islands, achieved through two exclusion layers — index-level exclusion for bookkeeping artifacts and graph-view exclusion for connective scaffolding.

## Overview

ADR-0023 formalizes the two-layer exclusion model that separates "what Obsidian indexes" from "what Obsidian draws in the graph". The distinction is important because sources and synthesis must stay searchable and provenance-intact even though they are not drawn as nodes.

## Key Facts

**Status:** Accepted

**Two exclusion layers:**

**Layer 1 — Index exclusion (`.obsidian/app.json` → `userIgnoreFilters`):**
Removes from the graph, search, and autocomplete permanently:
- `raw/` — provenance origin files
- `_templates/`, `_proposed/`, `_inbox/` — workflow artifacts
- `output/` — scratch space
- `CLAUDE.md` — schema file
- `wiki/log.md` — operations log

**Layer 2 — Graph-view exclusion (`.obsidian/graph.json` → `search`):**
Hides from the drawn graph only (stays searchable):
- `wiki/_sources/` — source summaries (provenance intact, not drawn)
- `wiki/_synthesis/` — cross-topic analysis (not drawn)
- `wiki/index.md` — root MOC (not drawn)

**Result:** Topic pages render as clean color-coded islands without a hairball of source/synthesis nodes connecting them.

**Consequences:**
- Sources and synthesis stay in the vault and in search — provenance is intact.
- The graph view is a topic map, not a "everything" view.
- ADR-0036 (strict tree) further refines the edges within each island.

## Related

ADR-0033 (topic-local linking) constrains which edges appear within an island. ADR-0036 (strict tree) reduces those edges further to only the `parent`/`children`/`child_indexes` spine.
