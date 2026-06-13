---
title: "ADR-0006: One Search Score Object"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "search", "scoring"]
aliases: ["ADR-0006: One Search Score Object"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0006: One Search Score Object

## Summary

Defines the single `SearchHit` score object shape with a `matched[]` breakdown. The invariant `score === sum(points)` ensures scores are fully explainable. Seven scoring channels are defined.

## Key Claims

- `SearchHit.matched[]` contains per-channel breakdown: `{channel, term, hits, points}`.
- `score === sum(matched[].points)` is the invariant.
- Seven channels: title-phrase, title-term, alias-term, tag-term, body-term, synonym-term, stem-term, graph-edge.
- The score object is shared across R1 (basic search), R2 (graph-expanded), and analyst modes.
- No embeddings: all scoring is deterministic keyword matching.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Search Score Object]]
- [[Wiki-Native Recall]]
- [[Scoring Channels]]
