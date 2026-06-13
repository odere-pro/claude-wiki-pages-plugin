---
title: "Local Models"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["reference", "local-model", "ollama"]
aliases: ["Local Models"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Local Models

## Summary

Documents which local models have passed the ADR-0011 quality gate and are approved for use. `qwen3-coder:30b` is the only approved model for `ingest-extract` and `query` tiers. Five models were tested and rejected. Claude Code stays primary.

## Key Claims

- Allow-list: `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`; enforced fail-closed.
- Approved: `qwen3-coder:30b` for `ingest-extract` (golden-set: schema 1.0, fidelity 1.0, field accuracy 0.93, dedup 1.0) and `query` (both cases perfect, zero fabrications).
- `draft` tier: WIRED but BLOCKED — no golden-set eval defined yet.
- Five rejected models: `qwen3.5:27b` (dedup failure), `gemma4:31b` (dedup 0.00 + schema 0.63), `gemma4:26b` (output-protocol unstable), `qwen3-vl:30b` (vision model on text task), `gpt-oss:20b` (only model to fabricate).
- The real barrier is structural: exact page-set (`dedup`) with schema-valid frontmatter. Provenance discipline is widespread; fabrication is rare.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Approved Local Model]]
- [[Local Model Quality Gate]]
- [[Golden Set]]
- [[Zero-Fabrication Floor]]
- [[Capability Tier]]
