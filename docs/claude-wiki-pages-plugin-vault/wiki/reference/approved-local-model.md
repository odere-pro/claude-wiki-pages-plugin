---
title: "Approved Local Model"
type: concept
aliases: ["Approved Local Model", "approved local model", "qwen3-coder:30b", "APPROVED_LOCAL_MODELS"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[ADR-0011: Local-Model Quality Gate]]", "[[ADR-0017: Fabrication Floor]]", "[[ADR-0019: Query Tier]]", "[[Local Models]]"]
related: ["[[Local Model Quality Gate]]", "[[Capability Tier]]", "[[Offline Policy]]", "[[Golden Set]]", "[[Zero-Fabrication Floor]]"]
tags: ["concept", "local-model"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Approved Local Model

## Definition

An approved local model is a local model (Ollama / LM Studio) that has passed the ADR-0011 quality gate with committed, reproducible evidence and is therefore on the `APPROVED_LOCAL_MODELS_BY_TIER` allow-list. The engine enforces this list fail-closed.

## Key Principles

- **Currently approved:** `qwen3-coder:30b` for both `ingest-extract` and `query` tiers.
- **Enforcement:** `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`. `claude-wiki-pages config validate` fails closed if `localModel.model` is not on the list.
- **Claude Code stays primary:** local model use is opt-in (`localModel.enabled: false` by default) and always routed through the `_proposed/` gate (for drafting) or with runtime answer verification (for querying).
- **Tier-scoped:** clearing the gate at `ingest-extract` does not automatically approve the model for `query`; each tier has its own evidence requirement.
- **Adding a model:** run the tier's eval script, commit reproducible artifacts, add to `APPROVED_LOCAL_MODELS_BY_TIER`, amend the ADR — all in one change.

## Examples

`qwen3-coder:30b` at `ingest-extract`:
- schema-validity: 1.0, claim-source-fidelity: 1.0, frontmatter-field-accuracy: 0.93, dedup-correctness: 1.0
- Zero fabrications (verbatim partition test, ADR-0017)

## Related Concepts

- [[Local Model Quality Gate]] — the evaluation methodology
- [[Capability Tier]] — the tier the model is approved for
- [[Offline Policy]] — governs when local models stand in for Claude
- [[Golden Set]] — the eval fixtures used to score the model
- [[Zero-Fabrication Floor]] — the hard floor a model must clear
