# ADR-0017: Fabrication floor — verbatim partition of extra claim pairs

- **Status:** Accepted
- **Date:** 2026-06-11
- **Amends:** [ADR-0011](./ADR-0011-local-model-quality-gate.md) (the `ingest-extract` quality gate)
- **Anchor:** §7 (provenance, non-negotiable); §5 (NO-RAG, absolute)

## Context

ADR-0011's zero-fabrication floor was implemented as a strict set difference:
every candidate `(source, quote)` pair **not present in the gold reference**
counted as a fabricated sourced claim, and a single one failed the tier.

The first measured run (2026-06-11, the four-model Ollama matrix driven by
`scripts/eval-produce-ollama.sh`) exposed a conflation in that definition.
`qwen3-coder:30b` cleared every ratio bar (schema 1.0, fidelity 1.0, fields
0.93, dedup 1.0) and **invented nothing** — including on the `provenance-trap`
case, whose deliberately-omitted price/license facts it correctly declined to
state. It still failed the floor: it cited 2/1 **extra** quotes that are
verbatim sentences of the raw input which the gold's editorial selection simply
did not include (e.g. *"It converts files between markup formats such as
Markdown, reStructuredText, HTML, LaTeX, and Microsoft Word docx."*).

The strict set-diff therefore cannot distinguish two very different failures:

1. **Invention** — a sourced claim whose quote does **not** exist in the raw
   input. This is the provenance violation §7 exists to prevent. It must
   remain the floor.
2. **Over-citation** — a quote that **is** verbatim input text, merely beyond
   the gold's selection. This is an editorial-cardinality mismatch. Passing
   the strict floor required guessing the gold's exact claim subset, which
   measures luck, not provenance discipline — and quoting *more* real source
   text is the opposite of fabrication.

## Decision

With the case's raw input supplied (`--input <raw-input.md>`), the scorer
**partitions** extra claim pairs (candidate-not-in-gold):

- A pair whose quote is a **verbatim substring of the raw input** after
  whitespace normalization (every whitespace run — including the hard line
  wraps of the input file — collapsed to a single space; then an **exact**
  fixed-string substring test, never similarity) is **over-citation**:
  reported in the scorecard (`over_citation`), **not** floored.
- A pair whose quote is **not** in the input is **fabricated**: the floor
  input, unchanged at zero tolerance.
- An empty quote can never be verbatim and stays fabricated.
- Any partition error dies (rc 2) — the floor never fails open, and the
  partition must account for every extra pair exactly once.

Without `--input`, the strict legacy definition is unchanged (every extra pair
is fabricated) — existing invocations and the self-test are unaffected.

Artifacts: `--stamp` records `input_path` (empty when scored under the legacy
definition) and the `over_citation` count; `--verify-artifact` re-scores under
the **same** floor definition the verdict was produced under and fails closed
if a recorded input file is missing or any recorded metric (including
`over_citation`) does not reproduce.

## What this does not change

- The floor stays **fixed and non-tunable at zero** — for *invented* claims.
- Thresholds for the four ratio metrics are untouched.
- §5 NO-RAG holds: the verbatim check is exact string containment after a
  pure-text whitespace normalization. No embeddings, no similarity.
- Fidelity is still measured against the gold pairs; a candidate that *drops*
  gold claims still fails at `< 0.97`.
- Over-citation is **reported, not free**: a future calibration may cap it
  (e.g. as a precision ratio) if measured runs show models padding pages with
  marginal quotes. That would be a new threshold decision, not a floor change.

## Consequences

- The gate now measures what §7 actually demands — *no invented sourced
  claims* — instead of *exact reproduction of the gold's editorial taste*.
- Under the amended definition, `qwen3-coder:30b` passes both golden-set cases
  (fabricated 0, over_citation 2 and 1). The measured-run artifacts committed
  alongside this ADR (`tests/eval/runs/ingest-extract/qwen3-coder-30b/`) are
  the ADR-0011 condition-3 evidence for unlocking the `ingest-extract` tier
  for that model.
- The strict mode remains available (omit `--input`) and remains the default
  behavior of every pre-existing call site.
