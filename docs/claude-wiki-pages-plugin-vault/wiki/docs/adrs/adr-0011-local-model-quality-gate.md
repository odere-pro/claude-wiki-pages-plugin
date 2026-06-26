---
title: "ADR-0011: Local-Model Quality Gate"
type: entity
entity_type: standard
aliases: ["ADR-0011", "adr-0011", "local model quality gate ADR", "golden-set eval"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0011|ADR-0011: Local-Model Quality Gate]]"]
related: []
tags: ["docs", "adrs", "local-models", "quality-gate"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0011: Local-Model Quality Gate

Establishes the fixtures-based golden-set evaluation that qualifies local (Ollama) models at the `ingest-extract` tier — scoring by exact structural comparison, never by embedding similarity.

## Overview

ADR-0011 is the first step in a capability-tier progression for local models. It defines what "good enough for ingest-extract" means precisely enough to gate it in CI. The constraint that §5 NO-RAG is absolute (no embeddings even in the test layer) shapes every aspect of the eval design.

## Key Facts

**Status:** Accepted (amended by ADR-0017 — fabrication floor partitions extra claim pairs into invented vs over-citation)

**Scope:** `ingest-extract` tier — the narrowest capability (smallest blast radius because local output routes through `_proposed/` for human approval).

**Eval method:** Field-by-field exact structural comparison against a gold reference fixture. A model's output is correct iff it is structurally equal under a deterministic comparator.

**Constraints:**
- Never score by embedding similarity — that would smuggle the forbidden mechanism into the test layer.
- Reuse the shipped verify/test machinery; no parallel verifier.
- Three binding build conditions must pass (calibrated thresholds).

**Approved model:** `qwen3-coder:30b` (measured-unlocked at time of writing).

**Consequences:**
- The eval is a regression test: a model passing once must keep passing on every subsequent run.
- ADR-0017 adds nuance by distinguishing fabrications (floored) from over-citations (reported).
- ADR-0019 extends the same pattern to the `query` tier.

## Related

ADR-0017 amends this ADR with the fabrication floor. ADR-0018 adds the offline routing policy that decides when a local model is used. ADR-0019 extends capability gating to the query tier.
