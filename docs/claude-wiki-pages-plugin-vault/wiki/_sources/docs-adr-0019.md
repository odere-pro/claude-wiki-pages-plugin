---
title: "ADR-0019: Query Tier and Runtime Answer Verification"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0019: Query Tier and Runtime Answer Verification

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-11
- **URL:** —

## Summary

ADR-0019 adds a `query` tier to the local-model capability progression and defines runtime answer verification for that tier. Finding pages is deterministic (lexical search, NO-RAG); composing answers from them is the LLM work. The query tier unlocks for local models only when the golden-set eval passes and a runtime verbatim-citation check confirms answers are grounded.

## Key Claims

Status: Accepted. Amends ADR-0018 (adds `query` row to APPROVED_LOCAL_MODELS_BY_TIER). Two layers of protection for query: gate-level (per-tier golden-set eval) and runtime (verbatim-citation check — every claim in the answer must have a traceable source citation from the wiki pages retrieved). A wrong answer is shown to a human directly (unlike ingest which stages in `_proposed/`), so the extra runtime check is required. `qwen3-coder:30b` is measured-unlocked for query.

Covers: Query Tier, Runtime Answer Verification, Verbatim Citation Check, Local Model Query
