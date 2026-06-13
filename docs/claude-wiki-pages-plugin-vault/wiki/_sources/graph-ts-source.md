---
title: "graph.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "graph", "traversal"]
aliases: ["graph.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# graph.ts Source

## Summary

`src/core/graph.ts` is the ONE deterministic link-walk in the engine. `walk()` performs a N≤2 BFS over typed wikilinks from `ontology-profile-v1`. It returns scored `GraphRef` objects (no bodies — frontmatter only). Determinism is enforced by processing the frontier in sorted vault-relative path order, iterating predicates in fixed `edges` array order, and sorting resolved targets by title. Output is sorted by (hop asc, score desc, file asc). `R2_EDGES = ["sources", "related", "depends_on"]` is the default traversal set for the `--graph` flag.

## Key Claims

- `GraphEdge` is a closed union: `"sources" | "related" | "depends_on" | "parent" | "key_pages" | "members" | "scope" | "child_indexes" | "contradicts" | "supersedes"`.
- `R2_EDGES` is the provenance/association core for R2 `--graph`; Phase 3 additions (`contradicts`, `supersedes`) are intentionally absent.
- `W_GRAPH_HOP1=2`, `W_GRAPH_HOP2=1` — hop-decayed, strictly below direct title match (5) and same as synonym (2).
- `buildTitleIndex()` scans wiki/ once and builds a `Map<normalizedTitle, absoluteFilePath>` including aliases.
- `maxHops` is clamped to 1–2; passing 99 is identical to passing 2.
- Dangling wikilinks are silently skipped; no error is emitted.
- Nearest-hop dedup: a page reached at hop-k is never revisited at hop-(k+N).

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Graph Walk Algorithm]]
- [[Search Scoring Algorithm]]
- [[Wiki-Native Recall]]
