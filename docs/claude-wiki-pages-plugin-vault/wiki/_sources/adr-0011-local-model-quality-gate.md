---
title: "ADR-0011: Local-Model Quality Gate"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "local-model", "quality-gate"]
aliases: ["ADR-0011: Local-Model Quality Gate"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0011: Local-Model Quality Gate

## Summary

Establishes the golden-set evaluation methodology for qualifying local models for the `ingest-extract` capability tier. Four metrics plus a zero-fabrication hard floor. `qwen3-coder:30b` is the first model to pass. The allow-list `APPROVED_LOCAL_MODELS` is enforced fail-closed.

## Key Claims

- Four metrics: schema-validity, claim-source-fidelity, frontmatter-field-accuracy, dedup-correctness. Each must meet its threshold.
- Zero-fabrication is a hard floor: a model that invents any sourced claim is rejected, period.
- `qwen3-coder:30b` cleared the bar (schema 1.0, fidelity 1.0, field accuracy 0.93, dedup 1.0).
- `APPROVED_LOCAL_MODELS` allow-list in `src/data/config/config.ts` is enforced fail-closed.
- Amended by ADR-0017: the verbatim partition distinguishes over-citation from fabrication.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Local Model Quality Gate]]
- [[Golden Set]]
- [[Zero-Fabrication Floor]]
- [[Capability Tier]]
- [[Approved Local Model]]
