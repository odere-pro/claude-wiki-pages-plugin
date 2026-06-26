---
title: "ADR-0011: Local-Model Quality Gate"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-05
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0011: Local-Model Quality Gate

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-05
- **URL:** —

## Summary

ADR-0011 defines the fixtures-based golden-set evaluation approach for qualifying local (Ollama) models at the `ingest-extract` tier. Models are unlocked only when they pass exact structural comparison against a gold reference — no embedding-based similarity scoring. Thresholds are calibrated; three binding build conditions must pass.

## Key Claims

Status: Accepted (amended by ADR-0017 which partitions extra claim pairs into invented vs over-citation). The eval reuses the shipped verify/test machinery; it scores by field-by-field exact structural comparison, never vector similarity. The narrowest tier (`ingest-extract`) is the first scope. Local-extracted output routes through `_proposed/` for the human-approval gate. The approved local model at time of writing: `qwen3-coder:30b`.

Covers: Local Model Quality Gate, Golden-Set Eval, Ingest-Extract Tier, NO-RAG Eval Constraint
