---
title: "Local Models (source)"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [local-models, ollama, quality-gate, capability-tiers]
aliases: ["Local Models (source)"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Local Models

## Summary

Documents the local model (Ollama/LM Studio) allow-list and capability tiers. `qwen3-coder:30b` is the only approved model, cleared for both `ingest-extract` and `query` tiers. Details the qualification process, tested-and-rejected models (with failure analysis), and the structural pattern that explains failures: provenance discipline is widespread; the real wall is structural (exact page-set dedup + schema-valid frontmatter as-emitted + output protocol).

## Key Claims

- Local model use is opt-in, off by default; Claude Code stays primary for every tier.
- `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts` is the engine-enforced allow-list; a tier with no approved model is WIRED but BLOCKED.
- Four tiers: `ingest-extract` (UNLOCKED, qwen3-coder:30b), `query` (UNLOCKED, qwen3-coder:30b), `draft` (WIRED but BLOCKED, none), full ingest/curator/synthesis (not wired).
- qwen3-coder:30b cleared ingest-extract (ADR-0011/0017) and query (ADR-0019, recall 1.0, quote coverage 1.0, zero fabrications).
- Rejected models: qwen3.5:27b (dedup failures), gemma4:31b (dedup 0.00, schema 0.63), gemma4:26b (output protocol unstable, schema 0.13), qwen3-vl:30b (vision model on text task), gpt-oss:20b (only model to fabricate).
- Five of six models invent nothing; the real wall is structural (dedup + schema-validity + output protocol).
- To add a model: run `eval-compare-ollama.sh`, commit evidence, add to APPROVED_LOCAL_MODELS_BY_TIER, amend ADR.
- Per ADR-0011 governance: unlock is per-model and per-tier; regression removes the model by reverse edit.

## Entities Mentioned

- [[qwen3-coder:30b]]
- `Ollama`

## Concepts Covered

- [[Capability Tier]]
- [[Quality Gate]]
- [[Approved Local Model]]
- [[Golden Set]]
- [[Ingest-Extract]]
- [[Query Tier]]
- [[Zero Fabrication Floor]]
- [[Answer Verification]]
