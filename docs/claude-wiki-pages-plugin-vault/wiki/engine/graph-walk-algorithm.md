---
title: "Graph Walk Algorithm"
type: concept
aliases: ["Graph Walk Algorithm", "graph walk", "BFS walk", "walk()", "graph traversal implementation"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[graph.ts Source]]", "[[search.ts Source]]", "[[Engine API Skill (SKILL.md)]]"]
related: ["[[Search Scoring Algorithm]]", "[[Tier-2 Deterministic Recall]]", "[[Wiki-Native Recall]]", "[[Deterministic Engine]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "graph", "traversal", "search"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 0.9
---

# Graph Walk Algorithm

## Definition

The Graph Walk Algorithm is the ONE deterministic link-walk in the engine, implemented as `walk()` in `src/core/graph.ts`. It performs a breadth-first search (BFS) of at most N=2 hops over typed frontmatter wikilinks, starting from seed pages and returning scored `GraphRef` objects. It reads only frontmatter — `splitFrontmatter().body` is never called here. No vectors, no network, no embeddings.

> [!note]
> This page covers the **implementation** of the graph walk. See the existing [[Deterministic Engine]] page for the design-level context and [[Wiki-Native Recall]] for the NO-RAG principle it serves. The architecture-level design pattern is also discussed in the architecture wiki.

## Key Principles

- **Determinism contract**: same vault + seeds + edges + N → byte-identical output. Enforced by: frontier processed in sorted vault-relative path order; predicates iterated in fixed `edges` array order; resolved targets sorted by title; output sorted by (hop asc, score desc, file asc).
- **Closed predicate set (GraphEdge)**: only typed wikilink predicates from `ontology-profile-v1` are traversed: `sources`, `related`, `depends_on`, `parent`, `key_pages`, `members`, `scope`, `child_indexes`, `contradicts`, `supersedes`. Open fields like `tags` are never traversed.
- **R2_EDGES default**: `["sources", "related", "depends_on"]` — the provenance/association core used by the search `--graph` flag.
- **Hop-decayed scoring**: W_GRAPH_HOP1=2, W_GRAPH_HOP2=1. These are strictly below direct title match (5) and at-or-below synonym (2), so graph is always the weakest signal.
- **Nearest-hop dedup**: a page reached at hop-1 is never revisited at hop-2 (the `visited` set is seeded before each hop).
- **Dangling links silently skipped**: a wikilink pointing to a non-existent page produces no error finding.

## Examples

```typescript
const { refs } = walk({
  vault: "/path/to/vault",
  seeds: ["wiki/engine/search-scoring-algorithm.md"],
  edges: R2_EDGES,   // sources, related, depends_on
  maxHops: 2,
});
// refs[] is sorted: (hop asc, score desc, file asc)
// refs[0] = { hop: 1, via: "related", score: 2, wikilink: "[[Firewall]]", ... }
```

## Related Concepts

- [[Search Scoring Algorithm]] — the graph-edge channel is appended to search hits via this algorithm
- [[Tier-2 Deterministic Recall]] — the other expansion mechanism in search; graph is opt-in on top of it
- [[Wiki-Native Recall]] — the design principle motivating deterministic graph traversal
- [[Deterministic Engine]] — the engine whose only graph walk is this function
