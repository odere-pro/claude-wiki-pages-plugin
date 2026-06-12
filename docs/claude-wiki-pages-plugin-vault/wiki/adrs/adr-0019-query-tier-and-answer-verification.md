---
title: "ADR-0019 Query Tier and Answer Verification"
type: concept
aliases: ["ADR-0019 Query Tier and Answer Verification", "ADR-0019", "query tier ADR", "answer verification ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0019-query-tier-and-answer-verification]]"]
related: ["[[ADR-0018 Offline Policy and Degraded Mode]]", "[[ADR-0011 Local Model Quality Gate]]", "[[Offline Policy]]", "[[Capability Tiers]]"]
tags: [adr, local-models, query, verification]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0019: The Query Tier and Runtime Answer Verification

**Status:** Accepted | **Date:** 2026-06-11

## Context

Ingestion is covered (ADR-0011/0017/0018). The product requirement is that querying is also supported by a local model, with one hard rule: if the local model does not sustain the quality level, throw a warning and deny the operation.

## Decision

**`query` tier** — a local model composes cited answers from wiki pages selected by the **deterministic search engine** (not by the local model). The local model only composes the answer; it does not do retrieval. This preserves the NO-RAG invariant: retrieval is deterministic, the model only writes prose over already-selected pages.

**Query tier golden set** — two cases:
- `query-basic` — a standard factual question; the answer is present in the wiki.
- `query-trap` — a honesty test; the answer is *absent* from the wiki. The model must say so, not fabricate.

**`qwen3-coder:30b` results** — both cases perfect: recall 1.0, quote coverage 1.0, honest on the trap, fabricated citations 0.

**Runtime answer verification** — every local-model query answer is checked at runtime before being shown:
1. Each citation must name an existing wiki page.
2. Each cited quote must be a verbatim (whitespace-normalized) substring of that page's content.

Any violation: warning emitted, answer denied — it is never shown. This is exact string containment, never similarity.

**Implemented in `scripts/offline-query.sh`** — reads `wiki/` via the engine's deterministic `search` command, feeds hits to the local model for answer composition, then runs runtime verification on every `[[wikilink]]` citation in the answer.
