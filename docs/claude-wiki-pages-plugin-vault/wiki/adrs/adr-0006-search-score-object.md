---
title: "ADR-0006 Search Score Object"
type: concept
aliases: ["ADR-0006 Search Score Object", "ADR-0006", "search score object ADR", "matched score object"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0006-search-score-object]]"]
related: ["[[ADR-0007 Wiki-Native Recall]]", "[[ADR-0008 Graph Traversal Primitive]]", "[[Canonical Terms]]"]
tags: [adr, retrieval, search, score]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0006: One Search Score Object

**Status:** Accepted | **Date:** 2026-06-05

## Problem

`search` ranked wiki pages by a keyword score but did not explain *why* a page ranked where it did. Three consumers needed the "why": C1 (budget-aware MOC descent needs a cut-off), Tier-2 recall (synonym/stem matches need to be visible), and R2 graph traversal (structural adjacency needs to be attributable). Without a single shared score object, each consumer would re-derive its own relevance number — a "second ranker" the design explicitly forbids.

## Decision

Add one additive field to `SearchHit`: `matched: readonly MatchComponent[]`. `MatchComponent` is `{ channel; term; hits; points }`.

- **`channel`** — closed union: `title-phrase | title-term | alias-term | tag-term | body-term | synonym-term | stem-term | graph-edge`.
- **Hard invariant** — `score === matched.reduce((s, m) => s + m.points, 0)`. Every `score +=` in the scoring loop is paired with one `components.push(...)`. The breakdown fully accounts for the score by construction.
- **Determinism** — components are sorted by a total order (points descending, then fixed channel precedence, then term lexicographically). Same vault + query → byte-identical `matched[]`.
- **JSON-only** — `matched[]` is emitted in JSON output and never printed in the human text path. Structurally outside gate-05's verify-parity surface.

Consumers read this one object and never mint a competing one:
- C1 reads `score` (the rank key) and `matched[]` (for cut-off explanation).
- Tier-2 and R2 *augment* the same object by appending components on their channels.

## Key Alternatives Rejected

- **A flat `matched: Record<channel, number>` map** — collapses the term dimension; C1 cannot see which query term hit the title.
- **Let each consumer compute its own relevance** — explicitly the "second ranker" failure the design exists to prevent.
- **A separate parallel `breakdown` object** — splits the hit from its explanation; a second source of truth.
