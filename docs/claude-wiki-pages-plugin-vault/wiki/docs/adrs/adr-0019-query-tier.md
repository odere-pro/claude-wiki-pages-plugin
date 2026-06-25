---
title: "ADR-0019: Query Tier and Runtime Answer Verification"
type: entity
entity_type: standard
aliases: ["ADR-0019", "adr-0019", "query tier ADR", "runtime answer verification"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0019|ADR-0019: Query Tier and Runtime Answer Verification]]"]
related: []
tags: ["docs", "adrs", "local-models", "retrieval"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0019: Query Tier and Runtime Answer Verification

Adds the `query` tier to the local-model capability progression and mandates a runtime verbatim-citation check for every local-model answer — because a wrong answer reaches a human directly without a staging gate.

## Overview

ADR-0019 completes the Claude→Ollama swap story for read-only operations. Finding pages is already deterministic (lexical search, §5 NO-RAG). Composing answers from them is the LLM step. The query tier unlocks only when both a golden-set eval gate and a runtime per-answer citation check pass.

## Key Facts

**Status:** Accepted

**Amends:** ADR-0018 (adds `query` row to `APPROVED_LOCAL_MODELS_BY_TIER`).

**Two protection layers for query:**
1. **Gate-level (per-tier):** golden-set eval passes (same machinery as ADR-0011).
2. **Runtime:** every claim in a composed answer must have a traceable wiki-page source citation. If a claim cannot be traced, the answer is blocked or flagged.

**Why two layers:** Unlike ingest (where local output stages in `_proposed/` for human review), a query answer goes directly to the human. The runtime check is the last safety net before that display.

**Approved model:** `qwen3-coder:30b` (measured-unlocked for query).

**Consequences:**
- The query path is: lexical search (deterministic) → page retrieval → local LLM composition → runtime citation check → display.
- A failed citation check blocks the answer; the user sees a "could not verify" message, not a hallucination.
- The fabrication/over-citation partition (ADR-0017) applies to the runtime check as well.

## Related

ADR-0011 established the golden-set eval pattern. ADR-0017 defined the fabrication floor. ADR-0018 provides the offline routing policy that selects when to use the query tier.
