---
title: "ADR-0006: One Search Score Object"
type: source
source_type: manual
source_format: text
date_published: 2026-06-05
date_ingested: 2026-06-13
tags: ["adr", "search", "scoring"]
aliases: ["ADR-0006: One Search Score Object"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# ADR-0006: One Search Score Object

## Summary

Establishes a single shared `SearchHit` score object with a `matched[]` breakdown array. The invariant `score === sum(matched[].points)` ensures every awarded point is fully explainable. Eight scoring channels are defined. All downstream consumers — C1 MOC descent, Tier-2 recall, R2 graph traversal — read this one object rather than computing a second ranking.

## Key Claims

- `SearchHit.matched[]` carries a per-channel breakdown: `{ channel, term, hits, points }`.
- `score === sum(matched[].points)` is a hard invariant; every `score +=` is paired with a `components.push()` by construction.
- Eight channels: `title-phrase`, `title-term`, `alias-term`, `tag-term`, `body-term`, `synonym-term`, `stem-term`, `graph-edge`.
- `matched[]` is JSON-only; it is never printed in the human text render path, so gate-05 parity is unaffected.
- Components are sorted by a total order: points descending, then a fixed `CHANNEL_ORDER` precedence, then term lexicographically — same vault + same query produces byte-identical output.
- Rejected alternatives: flat `Record<channel, number>` (loses term dimension), per-consumer second ranker (violates Brief §6), rendering `matched[]` in human output (risks gate-05 blast radius).

## Entities Mentioned

- [[_sources/adr-0006-search-score-object|ADR-0006: One Search Score Object]] (this source)

## Concepts Covered

- [[engine/search-score-object|Search Score Object]] — the concept page for the `SearchHit` / `matched[]` design
- [[engine/search-scoring-algorithm|Search Scoring Algorithm]] — the weights and channel precedence that populate `matched[]`
- [[engine/tier-2-deterministic-recall|Tier-2 Deterministic Recall]] — emits `synonym-term` and `stem-term` channels into the object
- [[engine/graph-traversal-primitive|Graph Traversal Primitive]] — emits `graph-edge` channel into the object
- [[llm/wiki-native-recall|Wiki-Native Recall]] — the broader retrieval philosophy; the score object is how recall evidence is recorded
- [[llm/no-rag-principle|NO-RAG Principle]] — all scoring is deterministic keyword matching; no embeddings
- [[engine/shell-ts-parity|Shell-TS Parity]] — gate-05 parity contract that `matched[]`'s JSON-only discipline preserves
