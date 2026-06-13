---
title: "Local Model Quality Gate"
type: concept
aliases: ["Local Model Quality Gate", "local model quality gate", "quality gate", "ADR-0011 gate"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0011: Local-Model Quality Gate]]", "[[ADR-0017: Fabrication Floor]]", "[[Local Models]]"]
related: ["[[Golden Set]]", "[[Zero-Fabrication Floor]]", "[[Approved Local Model]]", "[[Capability Tier]]", "[[Offline Policy]]"]
tags: ["concept", "local-model", "quality"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Local Model Quality Gate

## Definition

The local model quality gate (ADR-0011) is the evaluation methodology that a local model must pass before it is added to the `APPROVED_LOCAL_MODELS_BY_TIER` allow-list. The gate is enforced fail-closed: an unapproved model is blocked, never run silently.

## Key Principles

- **Four metrics:** schema-validity (≥0.98), claim-source-fidelity (≥0.97), frontmatter-field-accuracy (≥0.90), dedup-correctness (≥0.90). A model must clear both golden-set cases.
- **Zero-fabrication floor:** a model that invents any sourced claim (a claim not verbatim-present in the input) is rejected, period — regardless of other scores (amended by ADR-0017).
- **Over-citation ≠ fabrication:** a `source_quotes` pair absent from the gold set but whose quote IS verbatim in the input is extra real citation, not fabrication (ADR-0017).
- **Evidence is committed:** reproducible eval artifacts go in `tests/eval/runs/`.
- **Unlock is per-model and per-tier:** a cleared model at `ingest-extract` is not automatically cleared at `query`.

## Examples

- `qwen3-coder:30b` at `ingest-extract`: schema 1.0, fidelity 1.0, field accuracy 0.93, dedup 1.0, zero fabrications — approved.
- `gpt-oss:20b`: fabricated a sourced claim on the provenance-trap test case — rejected.
- `qwen3.5:27b`: perfect schema, fidelity, field accuracy; dedup 0.33 — rejected (emitted more pages than the gold set).

## Related Concepts

- [[Golden Set]] — the checked-in fixtures used for eval scoring
- [[Zero-Fabrication Floor]] — the hard floor for fabricated sourced claims
- [[Approved Local Model]] — the allow-list result of a passed gate
- [[Capability Tier]] — the tier a model is approved for
