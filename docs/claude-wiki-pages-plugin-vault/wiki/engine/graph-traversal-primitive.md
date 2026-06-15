---
title: "Graph Traversal Primitive"
type: concept
aliases: ["Graph Traversal Primitive", "graph traversal primitive", "walk()", "BFS walk", "N-hop BFS"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[ADR-0008: One Graph-Traversal Primitive]]", "[[graph.ts Source]]"]
related: ["[[Graph Walk Algorithm]]", "[[Wiki-Native Recall]]", "[[Search Scoring Algorithm]]", "[[Tier-2 Deterministic Recall]]", "[[NO-RAG Principle]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "engine", "search", "graph"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Graph Traversal Primitive

> [!summary]
> The graph traversal primitive is the single function `src/core/graph.ts:walk()` that performs bodyless N-hop BFS over `sources`, `related`, and `depends_on` edges. N is hard-clamped to ≤ 2. Each hop reduces the score of a found page (hop-decay). The primitive is shared by R2 (graph-expanded search), R3 (analyst compile), and C1 (challenge mode). No second graph-walk function exists.

## Key Principles

- One function, one contract: ADR-0008 forbids implementing graph traversal more than once. All graph-expanded search modes share `src/core/graph.ts:walk()`.
- N ≤ 2 is a hard clamp enforced by the function itself, not by callers. Passing `maxHops: 5` is clamped to 2 internally.
- The walk is bodyless: it returns scored page references, never page bodies. Callers decide which pages to read after the walk.
- Hop-decay scoring weights direct associations more heavily than transitive ones: hop-0 seed pages contribute full score; hop-2 pages contribute score × decay².
- Visit order is alphabetical by page title — deterministic across runs regardless of vault index build order.

## Examples

Conceptual usage (R2 graph-expanded search):

```typescript
// Step 1: keyword search finds seed pages
const seeds = await keywordSearch(query, vaultIndex);

// Step 2: graph walk expands to neighbourhood
const expanded = walk(
  seeds.map(h => h.page),
  R2_EDGES,   // sources, related, depends_on
  2,          // maxHops (clamped to ≤ 2)
  vaultIndex
);

// Step 3: merge scored results (seeds + expanded, deduplicated)
const results = mergeScored(seeds, expanded);
```

The C1 challenge mode calls `walk()` with the same interface but different seed pages — topic pages plus pages linked via the `contradicts` edge — to find evidence on both sides of a contradiction.

## Definition

ADR-0008 established the "one primitive" constraint: instead of each search mode implementing its own graph traversal, a single shared function handles all graph-expanded retrieval. This prevents divergent semantics (one traversal using different edges or decay curves than another) and keeps the behavior auditable in one place.

`src/core/graph.ts:walk()` signature (simplified):

```typescript
walk(
  startPageTitles: string[],   // seed pages from keyword search
  edges: EdgeSet,              // the R2_EDGES set: sources, related, depends_on
  maxHops: number,             // hard-clamped to ≤ 2
  vault: VaultIndex            // pre-built index of all wiki pages
): ScoredPage[]                // scored references, not page bodies
```

## Key Properties

**Bodyless.** The primitive returns scored page references (title + score), never page bodies. Callers decide which pages to read after the walk; the walk itself does not load content.

**R2_EDGES.** Only three edge types are traversed: `sources` (provenance links), `related` (association links), and `depends_on` (dependency links). The `contradicts`, `supersedes`, and `children`/`child_indexes` edges are not traversed during graph-expanded search. This keeps the walk semantically focused on provenance and association.

**N ≤ 2 hard clamp.** Deeper walks are forbidden. Callers cannot pass `maxHops: 5`. The function enforces the ≤ 2 limit internally. This prevents the walk from becoming a full-graph scan and keeps latency bounded regardless of vault size.

**Hop-decay scoring.** Each hop reduces the score contribution of a found page:

- Hop 0 (seed pages from keyword search): full score
- Hop 1 (directly linked from a seed): score × decay factor
- Hop 2 (linked from a hop-1 page): score × decay factor²

The decay factor is defined in `src/core/graph.ts`. This weights direct associations more heavily than transitive ones — a page `related` to a seed is more relevant than a page `related` to a page `related` to the seed.

**Deterministic.** Visit order is alphabetical by page title, not insertion order into the index. This makes walk results reproducible across runs even when the vault index is rebuilt.

## Usage by Search Modes

| Mode                          | Uses walk()? | N   | Start pages                  |
| ----------------------------- | ------------ | --- | ---------------------------- |
| R1 (basic keyword search)     | No           | —   | —                            |
| R2 (graph-expanded search)    | Yes          | ≤ 2 | R1 top results               |
| R3 (analyst document compile) | Yes          | ≤ 2 | Query-relevant pages         |
| C1 (challenge mode)           | Yes          | ≤ 2 | Topic pages + contradictions |

## Related Concepts

- [[Graph Walk Algorithm]] — the implementation-level documentation of `walk()`, including BFS pseudocode and the visit-order invariant
- [[Wiki-Native Recall]] — the broader retrieval philosophy: keyword + synonym + graph, no embeddings
- [[Search Scoring Algorithm]] — the scoring model that produces the seed pages `walk()` extends
- [[Tier-2 Deterministic Recall]] — synonym expansion and stemming that run before the graph walk
- [[NO-RAG Principle]] — the architectural decision that graph walk replaces, not supplements, vector retrieval
