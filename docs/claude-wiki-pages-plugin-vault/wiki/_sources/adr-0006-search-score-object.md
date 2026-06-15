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
