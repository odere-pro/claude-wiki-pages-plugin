---
title: "ADR-0033: Topic-Local Linking"
type: entity
entity_type: standard
aliases: ["ADR-0033", "adr-0033", "topic-local linking ADR", "island graph ADR"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0033|ADR-0033: Topic-Local Linking and Island Graph]]"]
related: []
tags: ["docs", "adrs", "graph"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0033: Topic-Local Linking

The decision to restrict association links (`related`, `depends_on`, etc.) to same-topic-folder pages only, creating a set of topic islands in the Obsidian graph view.

## Overview

ADR-0033 is the first graph-shaping ADR. Before it, every cross-topic wikilink fused the entire vault into a hairball. ADR-0033 collects pages into topic islands by forbidding cross-topic association links.

## Key Facts

**Status:** Accepted (superseded in strictness by ADR-0036 which retains all ADR-0033 infrastructure)

**Problem being solved:** When pages freely link across topics, the graph collapses into one dense connected component — all structure is lost and the graph becomes unreadable. The wiki's topic folders are semantic units; the graph should reflect that.

**Decision — three-layer graph shaping:**

1. **Index-level exclusion** (`.obsidian/app.json` → `userIgnoreFilters`). Bookkeeping artifacts never appear: `raw/`, `_templates/`, `_proposed/`, `_inbox/`, `output/`, `CLAUDE.md`, `wiki/log.md`. Excluded at the Obsidian index level so they never show in graph, search, or autocomplete.

2. **Graph-view exclusion** (`.obsidian/graph.json` → `search` filter). Connective scaffolding that must stay searchable — `wiki/_sources/`, `wiki/_synthesis/`, `wiki/index.md` — is excluded from the drawn graph only. Still present and searchable; not drawn.

3. **Link restriction.** Association predicates (`related`, `depends_on`, `key_pages`, `members`, `scope`, `contradicts`, `supersedes`) may only connect pages within the same top-level topic folder. A cross-topic association is written as prose, not a wikilink. `parent`/`sources`/`children`/`child_indexes` are exempt (they target the navigation spine or `_sources/`, which the graph excludes from view).

**ROOT hub.** `wiki/index.md` connects to every top-level folder note (via `child_indexes:`). In the full graph this produces a hub-and-spoke; in the topic-island view (graph filter active), the root MOC is excluded and the islands float independently.

**Remediation script:** `scripts/disentangle-links.sh` detects and demotes cross-topic association links.

**Consequences:**
- The Obsidian graph renders as distinct topic clusters, each with its own folder note as the local hub.
- Cross-topic relationships are still captured as prose; they just do not draw graph edges.

## Related

ADR-0036 (Strict-Tree Topology) supersedes the linking rule portion of this ADR: even same-topic association links are demoted to tags under strict-tree. ADR-0033's three-layer infrastructure (index exclusion, graph-view filter, ROOT hub) remains in force.
