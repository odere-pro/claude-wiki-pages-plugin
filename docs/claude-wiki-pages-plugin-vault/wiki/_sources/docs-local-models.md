---
title: "Local Models"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "local-models"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Local Models

## Metadata

- File: `raw/repo/docs/local-models.md`
- Type: capability documentation

## Summary

Documents which local models (Ollama/LM Studio) have passed the ADR-0011 quality gate, which have been tested and rejected, and the process for qualifying a new model. The allow-list is enforced in code at APPROVED_LOCAL_MODELS_BY_TIER in src/data/config/config.ts.

## Key Claims

Only gate-approved models run locally; the allow-list is fail-closed. Capability tiers widen one at a time, each gated on its own measured evidence. Approved: qwen3-coder:30b for ingest-extract (golden-set evidence ADR-0011/0017) and query (perfect ADR-0019 golden-set scores; runtime answer verification). Tested and rejected: qwen3.5:27b (dedup failure), gemma4:31b (dedup 0.00 + schema 0.63), gemma4:26b (output-protocol unstable), qwen3-vl:30b (vision model), gpt-oss:20b (only model that fabricated — failed zero-fabrication floor). Pattern: five of six models invent nothing; the real wall is structural — producing exactly the right page-set (dedup) with schema-valid frontmatter (schema-validity) following the output protocol. Code-tuned models (qwen3-coder:30b) clear it. To add a model: run eval-compare-ollama.sh, copy evidence, stamp artifact, add to APPROVED_LOCAL_MODELS_BY_TIER, amend ADR.

Covers: Local Model Quality Gate, Capability Tiers, qwen3-coder, Model Evaluation, Fabrication Floor
