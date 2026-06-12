---
title: "ADR-0011 Local Model Quality Gate"
type: concept
aliases: ["ADR-0011 Local Model Quality Gate", "ADR-0011", "local model quality gate ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0011-local-model-quality-gate]]"]
related: ["[[Local Model Quality Gate]]", "[[Approved Local Models]]", "[[ADR-0017 Fabrication Floor]]", "[[ADR-0018 Offline Policy and Degraded Mode]]"]
tags: [adr, local-models, quality-gate]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0011: Local-Model Quality Gate

**Status:** Accepted | **Date:** 2026-06-05

## Problem

The north star is a full Claude→Ollama swap, gated on local models proving stable, accurate output, widened one capability tier at a time "only as the bar is met." The open question: what eval and threshold declare a local model "good enough" for a given capability tier?

## Decision

A **fixtures-based golden-set eval** scoped first to the narrowest tier, `ingest-extract`, reusing the shipped verify/test machinery. Two non-negotiable constraints:

- **NO-RAG is absolute** — the eval measures extraction correctness by **exact structural comparison** to a gold reference. Never score output by embedding it and measuring vector similarity.
- **One-mechanism discipline** — the eval extends existing apparatus, not a parallel verifier.

**The eval** — `scripts/eval-ingest-extract.sh`. Metrics: `schema_validity`, `claim_source_fidelity`, `frontmatter_field_accuracy`, `dedup_correctness`, `fabricated_sourced_claims`. A model must clear **both** golden-set cases (extract-basic and provenance-trap).

**Three binding build conditions:**
1. A model is only on the allow-list if it passed both cases with committed, reproducible evidence.
2. `config validate` fails closed if `localModel.enabled` is true and the configured model is not on the list.
3. Unlocking a tier is a governance act: run the eval, commit evidence, add to `APPROVED_LOCAL_MODELS_BY_TIER`, amend the ADR — all in one change.

The `ingest-extract` tier routes all local-extracted output through `_proposed/` for human review before anything reaches `wiki/`.

See [[ADR-0017 Fabrication Floor]] for the amended zero-fabrication floor definition, and [[ADR-0018 Offline Policy and Degraded Mode]] for the offline routing machinery.
