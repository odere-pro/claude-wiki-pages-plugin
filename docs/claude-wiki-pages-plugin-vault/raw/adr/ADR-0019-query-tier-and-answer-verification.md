# ADR-0019: The query tier and runtime answer verification

- **Status:** Accepted (2026-06-11)
- **Date:** 2026-06-11
- **Builds on:** [ADR-0011](./ADR-0011-local-model-quality-gate.md) (per-tier quality gate), [ADR-0017](./ADR-0017-fabrication-floor-verbatim-partition.md) (verbatim partition), [ADR-0018](./ADR-0018-offline-policy-and-degraded-mode-routing.md) (offline policy, per-tier map)
- **Anchor:** §5 (NO-RAG, absolute); §7 (provenance, non-negotiable); Decision #7 (per-tier capability progression)

## Context

The product requirement is that the **basic operations — ingestion and querying —
are supported by a local model**, with health-check and maintenance optional, and
with one hard rule: **if the local model does not sustain the quality level, throw
a warning and deny the operation.**

Ingestion is already covered: the `ingest-extract` tier is unlocked for
`qwen3-coder:30b` (ADR-0011/0017), and ADR-0018 added the offline machinery
(`offline-draft.sh`, the `route` decision, the per-tier map). The health check
(`doctor`) is deterministic — it needs no LLM and already works offline.
Maintenance reasoning stays Claude-first.

Querying is the gap. Answering a question from the wiki has two parts: **finding**
the relevant pages (already deterministic — the lexical search engine, §5 NO-RAG)
and **composing** a cited answer from them (LLM work, Claude-only until now). A
query tier for local models needs the same two layers of protection every tier
gets, plus one more, because a wrong answer is shown to a human directly rather
than staged in `_proposed/` for review:

1. **Gate-level (per-tier):** the tier unlocks only on measured golden-set
   evidence — an unproven model is denied with a teaching message.
2. **Runtime (per-answer):** even a gate-approved model can have a bad day. A
   query answer has no `_proposed/` staging area to catch it, so the answer
   itself must be verified before it is shown.

## Decision

### 1. The `query` tier

Add `"query"` to the `localModel.tier` enum and to `APPROVED_LOCAL_MODELS_BY_TIER`.
At this tier a local model **composes cited answers** from pages selected by the
deterministic search engine. It is **read-only**: the query path writes nothing
to the vault, ever. Page selection stays purely lexical (`engine.sh search` —
candidate filters and Tier-2 vocabulary recall, no embeddings); the local model
only turns deterministically selected pages into a cited answer.

### 2. The query golden set and gate

`tests/eval/query/cases/` holds the golden set, scored by `scripts/eval-query.sh`
(exact comparison, never similarity):

- `query-basic` — a question answerable from the corpus. The gold names the
  required citation pages and required verbatim quotes.
- `query-trap` — a question about a fact the corpus deliberately omits. The gold
  expects the model to declare `COVERAGE: none` and invent nothing.

The model must emit a strict, machine-parseable protocol (mirrors the FILE
protocol's rationale — delimiter blocks, not JSON):

```text
===ANSWER===
<prose answer>
===COVERAGE: full|partial|none===
===CITATIONS===
[[Page Title]] | "<verbatim sentence from that page>"
===END===
```

Calibrated bar (a model must clear **both** cases):

| Metric                                                                               | Threshold                     |
| ------------------------------------------------------------------------------------ | ----------------------------- |
| Citation recall (required citations cited)                                           | ≥ 0.90                        |
| Quote coverage (required quotes present)                                             | ≥ 0.90                        |
| Coverage honesty (`COVERAGE` matches gold)                                           | exact match                   |
| **Fabricated citations** (nonexistent page, or quote not verbatim in the cited page) | **== 0** (floor, non-tunable) |

The fabrication floor reuses the ADR-0017 verbatim definition: whitespace-
normalized exact substring, never similarity. Per ADR-0011 governance, the tier
unlocks per-model on committed, reproducible evidence under
`tests/eval/runs/query/`.

### 3. Runtime answer verification (the per-answer deny rule)

`scripts/offline-query.sh` is the offline query path. After the model answers, it
runs **answer verification** — deterministic, in bash, before anything is shown:

- Every `[[citation]]` must resolve to an existing wiki page (by `title:` or
  `aliases`).
- Every cited quote must be a verbatim (whitespace-normalized) substring of that
  page.
- A parse failure, an unresolvable citation, or a non-verbatim quote **throws a
  warning and denies the answer** — exit 1, nothing presented. The failure
  message names which citation failed and why.

This is the tier's substitute for the `_proposed/` review gate: ingest output is
staged for a human; query output is verified by the machine or not shown at all.

### 4. Doctor and maintenance

- `doctor` is deterministic and LLM-free — it already works fully offline and
  needs no tier.
- Maintenance (curator reasoning, heal judgment) remains Claude-first. Its tier
  is not added until someone defines its golden set and measures a model — the
  standard progression.

## What this does not change

- §5 NO-RAG holds end-to-end: lexical page selection, exact-string verification,
  no embeddings anywhere.
- §7 provenance holds: a query answer can only cite text that verifiably exists
  in the wiki; everything else is denied.
- The ingest-extract gate, the `_proposed/` channel, and the ADR-0018 routing are
  untouched. `route` is tier-agnostic and needs no change.
- Claude remains primary: the query tier is opt-in (`localModel.enabled` +
  `tier: "query"`) and only used offline or by explicit invocation.

## Measured pass (2026-06-11)

`ollama:qwen3-coder:30b` cleared the query bar on both golden-set cases with
perfect scores: citation recall 1.0, quote coverage 1.0, coverage honest
(declared `none` on `query-trap` and invented nothing), fabricated citations 0.
Evidence: `tests/eval/runs/query/qwen3-coder-30b/` (raw answers + scorecards +
measured-run stamp). The `query` tier is unlocked for **that model only**. The
runtime deny rule was also observed working live: an earlier prompt revision
produced a mis-attributed citation (right quote, wrong page) and
`offline-query.sh` denied the answer with the teaching warning — the per-answer
guard catching exactly the failure class it was designed for.

## Consequences

- "Basic operations supported locally" becomes true the moment a model clears
  the query gate: ingest (staged + reviewed) and query (verified per answer)
  both run with zero Claude.
- The quality rule the product demands — _warn and deny when quality is not
  sustained_ — is enforced twice: at config time (per-tier allow-list, teaching
  message, exit 1) and at answer time (verification, warning, denial).
- A model that passes the gate but later fabricates at runtime is contained: the
  fabricated answer is denied, and repeated runtime denials are the signal to
  re-measure and, if confirmed, remove the model from the tier row (the
  reverse-edit governance of ADR-0011).
