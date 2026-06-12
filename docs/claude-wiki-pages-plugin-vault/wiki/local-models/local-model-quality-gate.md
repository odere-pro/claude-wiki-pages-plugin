---
title: "Local Model Quality Gate"
type: concept
aliases: ["Local Model Quality Gate", "quality gate", "ADR-0011 gate"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[local-models]]"]
related: ["[[Approved Local Models]]", "[[Capability Tiers]]", "[[Offline Policy]]"]
depends_on: ["[[Capability Tiers]]"]
tags: [local-models, quality-gate, evaluation]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Local Model Quality Gate

The local model quality gate (ADR-0011) defines how a local model qualifies for a capability tier. The allow-list (`APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`) is enforced in code: `claude-wiki-pages config validate` fails closed if `localModel.enabled` is true and the configured model is not on the list.

## The Gate Design

A model qualifies for a tier by passing a **golden-set eval**: a fixtures-based structural comparison to a gold reference. Every comparison is exact and deterministic — field-by-field, claim-by-claim, schema-valid or not. The eval never scores output by embedding it or measuring vector similarity (that would import the forbidden NO-RAG mechanism through the test layer).

## Metrics for `ingest-extract` Tier

The bar for the `ingest-extract` tier:
- `schema_validity` ≥ 0.98
- `claim_source_fidelity` ≥ 0.97
- `frontmatter_field_accuracy` ≥ 0.90
- `dedup_correctness` ≥ 0.90
- `fabricated_sourced_claims` = 0 (hard floor)

A model must clear **both** golden-set cases (extract-basic and provenance-trap).

## The Zero-Fabrication Floor (ADR-0017)

The fabrication floor is a verbatim partition: a candidate `(source, quote)` pair that is a verbatim sentence of the raw input (whitespace-normalized) but not in the gold reference is classified as **over-citation** (extra real citation, not invention). Only pairs that are neither in the gold nor in the raw input count as fabrication. This distinction was introduced after `qwen3-coder:30b` failed the original floor despite inventing nothing.

## Adding a Model

```bash
# 1. Run the eval
bash scripts/eval-compare-ollama.sh --models "<name:tag>" --retries 2
# 2. If it passes both cases, copy evidence and stamp artifacts
# 3. Add to APPROVED_LOCAL_MODELS_BY_TIER in src/data/config/config.ts
# 4. Add a row to the Approved table in local-models.md
# 5. Amend the ADR — all in one change
```

Unlocking a tier is a governance act: run the eval, commit reproducible evidence, add to the allow-list, and amend the ADR. No blanket "Ollama is ready" claim — per-model, per-tier.
