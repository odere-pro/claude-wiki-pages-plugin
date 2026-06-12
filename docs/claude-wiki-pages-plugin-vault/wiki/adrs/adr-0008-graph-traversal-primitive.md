---
title: "ADR-0008 Graph Traversal Primitive"
type: concept
aliases: ["ADR-0008 Graph Traversal Primitive", "ADR-0008", "graph traversal ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0008-graph-traversal-primitive]]"]
related: ["[[ADR-0006 Search Score Object]]", "[[ADR-0007 Wiki-Native Recall]]", "[[ADR-0004 Ontology Profile v1]]"]
tags: [adr, retrieval, graph]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0008: One Graph-Traversal Primitive

**Status:** Accepted | **Date:** 2026-06-05

## Problem

Keyword recall (ADR-0007) cannot surface a page that shares no terms with the query but is *structurally* adjacent to a hit — e.g., a tool page reached only through a `related` wikilink. The wiki already encodes those relationships as typed wikilinks in frontmatter. Multiple consumers (R2 for recall, C1 for descent, R3 for context) needed a walk, and if each forked its own traversal they would diverge on edge set, hop limit, and determinism.

## Decision

One shared primitive: `src/core/graph.ts:walk()`.

- **Deterministic, bounded breadth-first walk** over typed wikilinks in page frontmatter, reusing the existing frontmatter parser (no new parser).
- **Returns bodyless scored page references** — `GraphRef { wikilink; file; type; hop; via; score }` — and never reads page prose.
- **Edge set** is a closed union from the `ontology-profile-v1` predicate table (ADR-0004). R2's default edge set: `R2_EDGES = ["sources", "related", "depends_on"]`.
- **Total order determinism** — frontier pages in path order, predicates in fixed edge-array order, targets in title order. Same vault + seeds + edges + N → byte-identical output.
- **Hop ceiling clamped to N ≤ 2** structurally. A `visited` set makes the walk cycle-safe.
- **Domain/range not enforced at traversal time** — a lint concern (S1-check), not the walker's job.

R2 `--graph` is opt-in and off by default. Graph is the **weakest** signal: hop-decayed fixed weights strictly below synonym (hop-1 → `W_GRAPH_HOP1`, hop-2 → `W_GRAPH_HOP2`), emitted on the reserved `graph-edge` channel (last in `CHANNEL_ORDER`).

gate-13 (ADR-0007) already scans `src/core/graph.ts`, holding the walk to the same NO-embeddings invariant.

## Key Alternatives Rejected

- **Content-similarity neighbourhood** — violates the absolute NO-embeddings non-negotiable.
- **Per-consumer forked walks** — second-source-of-truth failure; they would drift on edge set, hop limit, and traversal order.
- **Return page bodies** — keeps the walk cheap; keeps text out of C1's context budget.
