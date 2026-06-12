---
title: "Approved Local Models"
type: concept
aliases: ["Approved Local Models", "approved models", "local model allow-list"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[local-models]]"]
related: ["[[Local Model Quality Gate]]", "[[Capability Tiers]]"]
tags: [local-models, evaluation, qwen3-coder]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Approved Local Models

The allow-list is per-model and per-tier. A model that clears the gate for one tier does not automatically qualify for others. `qwen3-coder:30b` is currently the only approved model.

## Approved

| Model | Tier | Evidence |
| --- | --- | --- |
| `qwen3-coder:30b` | `ingest-extract` | `tests/eval/runs/ingest-extract/qwen3-coder-30b/` — both golden-set cases pass, `--verify-artifact` reproducible |
| `qwen3-coder:30b` | `query` | `tests/eval/runs/query/qwen3-coder-30b/` — both ADR-0019 golden-set cases pass with perfect scores (recall 1.0, quote coverage 1.0, honest on the trap, fabricated 0) |

## Tested and Rejected (Measured 2026-06-11)

Tested on Ollama 0.30.7 (Apple M1 Pro, 32 GB), all six models × two golden-set cases:

| Model | Verdict | Why |
| --- | --- | --- |
| `qwen3.5:27b` | ❌ rejected | Perfect schema and fidelity; fails **dedup** (0.33/0.00) — emits more pages than the gold page-set |
| `gemma4:31b` | ❌ rejected | **dedup 0.00** on both cases; **schema-validity 0.63** on extract-basic |
| `gemma4:26b` | ❌ rejected | Output-protocol unstable; **schema-validity 0.13** — almost every page invalid |
| `qwen3-vl:30b` | ❌ rejected | Vision-language model on pure-text task; **claim-source-fidelity 0.00** |
| `gpt-oss:20b` | ❌ rejected | Only model that **fabricated** (invented a sourced claim on the provenance-trap case) |

## Pattern from the Results

Five of six models invented nothing — provenance discipline is widespread among modern local models. The real wall is **structural**: producing exactly the right page-set (`dedup`) with schema-valid frontmatter as-emitted, and following the output protocol without drift. `qwen3-coder:30b` clears it because code-tuned models are strong at exact structured output (YAML/frontmatter, file layout). The one genuine safety outlier is `gpt-oss:20b` — the only model to fabricate.
