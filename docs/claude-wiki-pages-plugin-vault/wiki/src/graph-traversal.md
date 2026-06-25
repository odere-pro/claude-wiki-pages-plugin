---
title: "Graph Traversal"
type: concept
aliases: ["graph-traversal", "Graph Walk", "BFS Walk", "R2 Graph Expansion"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-graph|src/core/graph.ts — Graph Traversal Primitive]]"]
related: []
tags: ["src", "core", "graph", "traversal", "search"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Graph Traversal

The ONE deterministic link-walk in the engine. A bodyless N≤2 BFS over typed wikilinks drawn from the `ontology-profile-v1` predicate table. Returns scored page references, never bodies.

## Definition

`core/graph.ts` implements the graph-traversal primitive (ADR-0008, team brief §6). It walks typed wikilinks with a breadth-first search up to a configurable hop depth, scoring each discovered page by hop distance. No vectors, no embeddings, no network.

## Key Principles

**Closed predicate set (`GraphEdge`)**: only these predicates from ontology-profile-v1 are ever traversed — `sources`, `related`, `depends_on`, `parent`, `key_pages`, `members`, `scope`, `child_indexes`, `contradicts`, `supersedes`. Open fields like `tags` are never traversed.

**R2_EDGES**: default predicates for `--graph` expansion: `sources`, `related`, `depends_on` (the provenance/association core).

**Hop-decayed scores**: hop-1 → `W_GRAPH_HOP1 = 2` (same as synonym-term); hop-2 → `W_GRAPH_HOP2 = 1`. Strictly below synonym weight. Hard ceiling `MAX_HOPS_CEILING = 2`.

**Determinism contract**:
- Frontier pages processed in SORTED vault-relative path order
- Predicates iterated in fixed `edges` array order
- Resolved targets processed in SORTED title order
- Nearest-hop dedup: a page reached at hop-k is never revisited at hop-(k+N)
- Output `refs` sorted by (hop asc, score desc, file asc)
- Same vault + seeds + edges + N → byte-identical output

**One-time title index**: `buildTitleIndex()` walks `wiki/` once, building a `Map<normalizedTitle, absoluteFilePath>`. Registers title, aliases, vault-relative path, filename stem. The walk uses this for O(1) resolution without re-scanning the filesystem.

**Dangling wikilinks silently skipped**: a link to a non-existent page produces no reference (no error).

## Examples

- `walk({ vault, seeds, edges, maxHops })` → `{ refs: GraphRef[] }`
- `GraphRef`: `{ wikilink, file, type, hop, via, score }`
- `R2_EDGES` used by search (`--graph`) and analyst agent for neighbourhood expansion

## Related Concepts

- Consumed by `commands/search/search.ts` for optional `--graph` expansion (R2)
- Consumed by `core/spine.ts`... indirectly through shared `resolveLink`
- `contradicts`/`supersedes` walking deferred to Phase 3 (YAGNI)
