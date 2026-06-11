---
title: "qwen3-coder:30b"
type: entity
entity_type: tool
aliases: ["qwen3-coder:30b", "qwen3-coder", "Qwen3 Coder 30b"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[Local Models (source)]]"]
related: ["[[claude-wiki-pages-orchestrator-agent]]", "[[Degraded Mode Routing]]", "[[Quality Gate]]", "[[Approved Local Model]]", "[[Capability Tier]]"]
tags: [tool, local-model, ollama, llm, ingest-extract, query]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 0.6
---

# qwen3-coder:30b

The only currently approved local model for `claude-wiki-pages`. A code-tuned model hosted via `Ollama`, unlocked for both the [[Ingest-Extract]] and [[Query Tier]] capability tiers as documented in ADR-0011, ADR-0017, and ADR-0019. Tested on Ollama 0.30.7, Apple M1 Pro (32 GB).

## Why It Passed

Code-tuned models excel at producing exact structured output — YAML frontmatter, file layout, output protocol — which is the real quality gate wall for local-model ingest. `qwen3-coder:30b` achieved perfect recall and zero fabricated sourced claims across both `ingest-extract` and `query` golden-set cases (ADR-0017/ADR-0019).

## Governance

Unlocked per the ADR-0011 governance process: committed, reproducible evidence in `tests/eval/runs/`. Regression removes the model by reverse edit. The allow-list (`APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`) is enforced in code, not documentation.

## See Also

- [[Local Models]] — full capability tier map and rejected model analysis
- [[claude-wiki-pages-orchestrator-agent]] — how the [[claude-wiki-pages-ingest-agent]] and other agents interact with local model routing
- [[Degraded Mode Routing]] — how the engine `route` command decides claude/local/blocked
