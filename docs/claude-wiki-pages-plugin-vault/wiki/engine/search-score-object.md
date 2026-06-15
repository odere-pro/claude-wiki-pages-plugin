---
title: "Search Score Object"
type: concept
aliases: ["Search Score Object", "search score object", "SearchHit", "matched[] breakdown", "score invariant"]
parent: "[[Wiki Engine]]"
path: "engine"
sources: ["[[ADR-0006: One Search Score Object]]", "[[search.ts Source]]"]
related: ["[[Wiki-Native Recall]]", "[[Search Scoring Algorithm]]", "[[Tier-2 Deterministic Recall]]", "[[NO-RAG Principle]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "engine", "search", "scoring"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Search Score Object

> [!summary]
> The search score object (`SearchHit`) is the single data structure that carries the result of any search operation in the claude-wiki-pages engine. It contains a `matched[]` array with a per-channel breakdown of every point awarded to a page, and enforces the invariant `score === sum(matched[].points)`. Scores are fully explainable by construction — every point has an attributed cause.

## Key Principles

- One score object for all modes: ADR-0006 forbids separate scoring formats across R1, R2, and analyst modes.
- The score invariant is compile-time-checked: `score === sum(matched[].points)` cannot be violated silently.
- Every scoring point has an attributed cause in `matched[]`; there are no hidden multipliers or post-hoc adjustments.
- The `graph-edge` channel is special — populated by the [[Graph Traversal Primitive]], not by direct keyword matching.
- The uniform format means the analyst's page-selection explanation is always the same mechanism: read `matched[]`.

## Examples

A `SearchHit` for the page "Firewall" after a query for "cross-vault write confinement":

```json
{
  "page": "Firewall",
  "path": "wiki/engine/firewall.md",
  "score": 4.7,
  "matched": [
    { "channel": "title-term",   "term": "firewall",   "hits": 1, "points": 2.0 },
    { "channel": "body-term",    "term": "cross-vault", "hits": 3, "points": 1.8 },
    { "channel": "synonym-term", "term": "confinement", "hits": 2, "points": 0.9 }
  ]
}
```

Verification that the invariant holds: `2.0 + 1.8 + 0.9 = 4.7 = score`. If this sum did not match, the TypeScript compiler would catch the violation at build time.

## Definition

ADR-0006 established the "one score object" constraint: instead of each search mode computing scores in its own format, all search modes produce and consume the same `SearchHit` shape. This ensures consistent explainability across R1 (basic keyword search), R2 (graph-expanded search), and analyst modes.

The `SearchHit` structure:

```typescript
interface SearchHit {
  page: string; // page title
  path: string; // vault-relative path to the page file
  score: number; // total score = sum(matched[].points)
  matched: MatchComponent[]; // per-channel breakdown
}

interface MatchComponent {
  channel: ScoringChannel; // which channel awarded these points
  term: string; // the query term that matched
  hits: number; // how many times the term matched in this channel
  points: number; // points awarded for this match
}
```

## The Score Invariant

`score === sum(matched[].points)` is a compile-time-checked invariant. It means:

- Every point in the final score has a traceable source in `matched[]`.
- It is impossible for a page to score 3.7 without `matched[]` showing exactly which channels contributed to that 3.7.
- Debugging a search result is a matter of reading `matched[]`; there are no hidden multipliers or post-hoc adjustments.

## Seven Scoring Channels

| Channel        | What it scores                                                     |
| -------------- | ------------------------------------------------------------------ |
| `title-phrase` | The full query phrase matches the page title exactly               |
| `title-term`   | Individual query terms match the page title                        |
| `alias-term`   | Query terms match a page alias                                     |
| `tag-term`     | Query terms match a page tag                                       |
| `body-term`    | Query terms match the page body (TF-IDF weighted)                  |
| `synonym-term` | Synonym-expanded terms match any field                             |
| `stem-term`    | Porter-stemmed terms match any field                               |
| `graph-edge`   | The page was found via a graph-walk hop from a higher-scoring page |

The `graph-edge` channel is special: it is populated by the [[Graph Traversal Primitive]], not by direct keyword matching. Pages found via graph-walk receive hop-decayed scores through this channel.

## Shared Across All Modes

The same `SearchHit` type is used by:

- **R1** (basic keyword search): only direct-match channels populated
- **R2** (graph-expanded): adds `graph-edge` hits from the walk
- **Analyst modes**: the analyst reads `SearchHit` objects to decide which pages to load for synthesis

This uniformity means the analyst's "why did you select this page?" explanation is always the same: read `matched[]`.

## Related Concepts

- [[Wiki-Native Recall]] — the overall retrieval philosophy; the score object is how recall evidence is recorded
- [[Search Scoring Algorithm]] — the weights and computation rules that populate `matched[]`
- [[Tier-2 Deterministic Recall]] — synonym and stem expansion that generates `synonym-term` and `stem-term` hits
- [[NO-RAG Principle]] — the invariant that all scoring is deterministic keyword matching, never embeddings
