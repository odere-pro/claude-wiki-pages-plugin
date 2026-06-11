---
title: "Approved Local Model"
type: concept
aliases: ["Approved Local Model", "approved local model", "approved models", "model allow-list"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[Local Models]]", "[[Glossary]]"]
related: ["[[Quality Gate]]", "[[Capability Tier]]", "[[qwen3-coder:30b]]", "[[Degraded Mode Routing]]"]
contradicts: []
supersedes: []
depends_on: ["[[Quality Gate]]"]
tags: [local-models, approved-models]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Approved Local Model

A local model that cleared the ADR-0011 ingest-extract quality gate with committed, reproducible evidence and is therefore on the `APPROVED_LOCAL_MODELS` allow-list the engine enforces fail-closed. `claude-wiki-pages config validate` fails closed if `localModel.enabled` is true and the configured `model` is not on the list.

The allow-list is meant to grow as models are measured — it is not a fixed endorsement of one vendor.

## Currently Approved

| Model | Tier | Evidence |
|---|---|---|
| `qwen3-coder:30b` | `ingest-extract` | `tests/eval/runs/ingest-extract/qwen3-coder-30b/` — both golden-set cases pass, `--verify-artifact` reproducible |
| `qwen3-coder:30b` | `query` | `tests/eval/runs/query/qwen3-coder-30b/` — both ADR-0019 golden-set cases pass; runtime answer verification on every answer |

## Tested and Rejected (as of 2026-06-11)

Measured on Ollama 0.30.7 (Apple M1 Pro, 32 GB).

| Model | Why rejected |
|---|---|
| `qwen3.5:27b` | Perfect schema/fidelity; fails **dedup** (0.33/0.00) — emits more pages than the gold page-set. Most promising future candidate. |
| `gemma4:31b` | **dedup 0.00** on both cases; **schema-validity 0.63** on extract-basic. Cannot produce the exact schema-clean page structure. |
| `gemma4:26b` | Output-protocol unstable (unterminated file stream on one case); **schema-validity 0.13**. |
| `qwen3-vl:30b` | Vision-language model on a pure-text task; **claim-source-fidelity 0.00** on extract-basic. Wrong tool. |
| `gpt-oss:20b` | **Only model that fabricated** — invented a sourced claim on the provenance-trap case. Fails the zero-fabrication floor. |

## The Pattern

Five of six models invent nothing — provenance discipline is widespread among modern local models. The real wall is **structural**: producing exactly the right page-set (dedup) with schema-valid frontmatter as-emitted (schema-validity), and following the output protocol without drift. Code-tuned models (`qwen3-coder:30b`) are strong at exact structured output (YAML/frontmatter, file layout).

---

# qwen3-coder:30b

The only currently approved local model for `claude-wiki-pages`. Approved for both `ingest-extract` and `query` capability tiers. Tested on Ollama 0.30.7, Apple M1 Pro (32 GB). Code-tuned model; strong at exact structured output.
