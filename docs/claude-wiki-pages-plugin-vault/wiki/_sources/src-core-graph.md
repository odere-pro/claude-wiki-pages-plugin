---
title: "src/core/graph.ts — Graph Traversal Primitive"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "graph", "traversal"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/graph.ts — Graph Traversal Primitive

## Metadata

- **Source**: `raw/repo/src/core/graph.ts`
- **Type**: TypeScript implementation

## Summary

The ONE deterministic link-walk in the engine. Implements §6 of the team brief: a bodyless, N≤2 BFS over typed wikilinks drawn from the `ontology-profile-v1` predicate table. Returns scored page references, never bodies. No vectors, no embeddings, no network.

## Key Claims

- `walk(opts)`: BFS over typed wikilinks; returns `GraphWalkResult` with sorted `refs`
- `GraphEdge` type: closed set of predicates from ontology-profile-v1 — `sources`, `related`, `depends_on`, `parent`, `key_pages`, `members`, `scope`, `child_indexes`, `contradicts`, `supersedes`
- `R2_EDGES`: default predicates for `--graph` expansion: `sources`, `related`, `depends_on`
- `GraphRef`: `wikilink`, `file`, `type`, `hop`, `via`, `score`
- Hop scores: hop-1 = 2 (W_GRAPH_HOP1), hop-2 = 1 (W_GRAPH_HOP2) — strictly below synonym (2) and exact title (5)
- Hard ceiling `MAX_HOPS_CEILING = 2`; clamped to [1, 2]
- Determinism contract: frontier sorted by vault-relative path, predicates in fixed order, targets sorted by title, nearest-hop dedup, output sorted by (hop asc, score desc, file asc)
- `buildTitleIndex()`: one-time Map<normalizedTitle, absoluteFilePath> over vault's `wiki/`; registers title, aliases, vault-relative path, filename stem
- Dangling wikilinks silently skipped; `contradicts`/`supersedes` walking deferred to Phase 3
Covers: Graph Traversal, BFS Walk, GraphEdge, R2 Edges, Hop-Decayed Scores
