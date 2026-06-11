---
title: "Quality Gate"
type: concept
aliases: ["Quality Gate", "quality gate", "model quality gate", "ADR-0011", "Golden Set", "golden set", "Zero Fabrication Floor", "zero fabrication floor", "Answer Verification", "answer verification"]
parent: "[[Local Models]]"
path: "local-models"
sources: ["[[Local Models (source)]]", "[[Glossary]]"]
related: ["[[Capability Tier]]", "[[Approved Local Model]]", "[[qwen3-coder:30b]]"]
contradicts: []
supersedes: []
depends_on: ["[[Capability Tier]]"]
tags: [local-models, quality-gate, evaluation]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Quality Gate

A defined eval metric and pass threshold that a local model must meet before a capability tier is widened. Prevents premature expansion of Ollama scope beyond proven ability. Governed by ADR-0011.

## The Bar (for `ingest-extract`)

A model must clear **both** golden-set cases with all of:
- **schema-validity ≥ 0.98**
- **claim-source-fidelity ≥ 0.97**
- **frontmatter-field-accuracy ≥ 0.90**
- **dedup-correctness ≥ 0.90**
- **zero fabricated sourced claims** (hard floor — see below)

## Adding a Model

```bash
# 1. Measure against the golden set
bash scripts/eval-compare-ollama.sh --models "<name:tag>" --retries 2

# 2. If it PASSES both cases, commit evidence and stamp artifacts
mkdir -p tests/eval/runs/ingest-extract/<slug>
# ... stamp + verify steps ...
```

Then add the model to `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`, add a row to the Approved table in `docs/local-models.md`, and commit the evidence in the same change.

---

# Golden Set

A checked-in fixtures set of raw-source inputs paired with their expected structured output (frontmatter plus claims). Used as the deterministic reference for the local-model quality-gate eval. Output is scored by exact comparison to the golden set, **never by vector similarity**.

Two cases exist for `ingest-extract`; two cases exist for `query`. A model must clear both cases.

---

# Zero Fabrication Floor

Hard requirement from ADR-0017: **zero fabricated sourced claims**. A model that invents a claim attributed to a source it cannot have read fails the gate, even if all other metrics are strong.

The verbatim-partition design (ADR-0017) partitions candidate `source_quotes` into two sets:
- **Verbatim**: the quote appears (whitespace-normalized) in the raw input → valid citation.
- **Non-verbatim**: the quote does not appear → fabricated → violation of the hard floor.

Over-citations (verbatim quotes absent from the gold reference) are reported but do not fail the gate.

---

# Answer Verification

The deterministic, per-answer runtime check applied to every local-model query answer (ADR-0019). Checks:
1. Each citation names an existing wiki page.
2. Each cited quote is a verbatim (whitespace-normalized) substring of that page.

Any violation throws a warning and **denies the answer** — it is never shown to the user. Exact string containment, never similarity. This is the NO-RAG guarantee applied to query-tier output.
