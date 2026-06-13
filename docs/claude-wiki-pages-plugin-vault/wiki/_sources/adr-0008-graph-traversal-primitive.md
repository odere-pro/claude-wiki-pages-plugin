---
title: "ADR-0008: One Graph-Traversal Primitive"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "search", "graph"]
aliases: ["ADR-0008: One Graph-Traversal Primitive"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0008: One Graph-Traversal Primitive

## Summary

Defines the single graph-traversal function `src/core/graph.ts:walk()` as the shared primitive for all graph-expanded search. It performs a bodyless N-hop BFS over `sources`, `related`, and `depends_on` edges. N ≤ 2 is a hard clamp. Scores are hop-decayed.

## Key Claims

- One function: `src/core/graph.ts:walk()`.
- R2_EDGES = `sources`, `related`, `depends_on` — the provenance/association core.
- N ≤ 2 hop limit, hard-clamped; deeper walks are forbidden.
- Hop-decayed scores: each hop reduces the contribution of a found page.
- Bodyless: the primitive returns scored page references, never page bodies.
- Shared by R2, R3, and C1 operations.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Graph Traversal Primitive]]
- [[Graph Link-Walk]]
- [[Wiki-Native Recall]]
