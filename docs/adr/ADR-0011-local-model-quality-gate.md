# ADR-0011: Local-model quality gate — a golden-set eval for the `ingest-extract` tier

- **Status:** Accepted
- **Date:** 2026-06-05
- **SPEC anchor:** §5 (NO embeddings — precompiled wiki pages); Brief §5 (NO-RAG, absolute),
  decision #7 (model-agnostic, quality-gated Ollama path) / §11.7
- **Supersedes proposal:** `docs/plan/0003-local-model-quality-gate.md` (this ADR records the
  ratified decision with the PM's calibrated thresholds)

## Context

Decision #7 makes the full Claude→Ollama swap the north star, gated on local models proving
stable/accurate/quality output, widened one capability tier at a time "only as the bar is met". The
roadmap named the gap precisely as an open implementation-unknown: *what eval and threshold declare
a local model "good enough" for a given capability tier*
(`docs/plan/0002-agentic-brain-roadmap.md:206-208`). Plan 0003 proposed the design — a
fixtures-based golden-set eval scoped first to the narrowest tier, `ingest-extract`, reusing the
shipped verify/test machinery and never embeddings. The PM **ratified** that design and directed it
be promoted to an ADR with **calibrated** thresholds (tighter than the proposal's starting numbers)
and three binding build conditions. This ADR is that record.

Two constraints frame the decision and are non-negotiable:

- **§5 NO-RAG is absolute.** The eval measures extraction correctness by **exact structural
  comparison** to a gold reference — field-by-field, claim-by-claim, schema-valid or not. It must
  never score output by embedding it and measuring vector similarity; that would smuggle the
  forbidden mechanism in through the test layer. "Correct" means *structurally equal under a
  deterministic comparator*, not *semantically close in a latent space*.
- **One-mechanism discipline.** The eval extends the apparatus the plugin already owns — it is not a
  parallel verifier.

The narrowest tier is the right first scope: `ingest-extract` has the smallest blast radius because
the local-ingest stub (Pc) routes all local-extracted output through the one `_proposed/`
human-review gate (`src/commands/propose/propose.ts`) before anything reaches `wiki/`. A model that
clears this bar still cannot write to the wiki unreviewed.

## Decision

Ratify the golden-set eval as the quality gate for the `ingest-extract` tier, with the PM's
calibrated bar, three binding build conditions, and a governance rule that keeps the Ollama
progression NO-GO until a measured pass lands.

**The gate.** A fixtures-based golden set — `(raw input → expected structured output)` pairs —
scored by **exact structural comparison** to the gold reference, run offline. It **reuses** the
shipped comparators, not a new verifier: schema-validity via `scripts/verify-ingest.sh` and
`scripts/validate-frontmatter.sh` (the checks the plugin already enforces on real ingest), and
field-/claim-level diffs built on the engine frontmatter parser and the `Finding` result model
(`src/core/report.ts`), surfacing mismatches as findings in the same shape `verify` emits. It is an
opt-in `eval` selector in `tests/run-tests.sh` that **self-skips** when no local model is configured
(mirroring how `tier2` self-skips without the `claude` CLI), so CI never hard-fails on a missing
optional model.

**The calibrated bar (PM-ratified — these exact numbers), `ingest-extract` only.** A local model is
"good enough" for the tier only when, over the full golden set, it meets **all** of:

- **Schema-validity rate ≥ 0.98**, measured **with NO auto-repair in the eval path** — the
  candidate is scored exactly as the model emitted it; the eval never runs `fix`/`heal` or any
  repair before scoring. (Repairing first would measure the repairer, not the model.)
- **Claim↔source fidelity ≥ 0.97** — tightened from the proposal's 0.95. Every extracted claim must
  be present in the gold set (none fabricated) and cite the correct source, with golden claims not
  dropped.
- **Frontmatter-field accuracy ≥ 0.90** — correct classification/placement of the meaningful fields
  (`type`, the `ontology-profile-v1` enums, `title`, `parent`, `path`, `sources` presence and
  correctness).
- **Two-pass dedup correctness ≥ 0.90** — the model updates an existing page rather than spawning a
  duplicate when input overlaps a page already present (the entity-distribution rule).

**Plus the zero-fabricated-sourced-claims FLOOR — fixed and non-tunable.** A single invented
claim-with-citation fails the tier regardless of every aggregate above. Provenance fidelity (§7) is
a floor, not a dial: a model that launders one unsourced claim into a `sources`-bearing page is
disqualified even at otherwise perfect scores.

All four rates are exact-match counts and ratios against the gold reference — no similarity, no
embeddings.

**Three binding build conditions (PM).** The eval is only valid if:

1. **The golden set is model-neutral and adversarial-reviewed**, and includes a deliberate
   **provenance trap** — a case authored so that a fabricating or claim-dropping extraction is
   *forced* to trip the floor, so the floor is exercised, not merely declared.
2. **The scoring driver is self-tested fail-closed.** A `--self-test` passes a known-good fixture
   and **fails** a fabricating one; internal errors are fatal and never swallowed. The
   **gate-13 fail-open** (a regex that silently passed) is the named precedent to avoid — the eval
   must not be able to green a bad model through a swallowed error.
3. **The measured-run artifact is machine-checkable and reproducible.** Each run emits a scores JSON
   carrying `model_id`, `golden_set_sha`, and `recorded_at` alongside the per-metric rates and
   verdict. It is attached to any change that flips the default provider and is **re-run by the PM**
   against the cited `golden_set_sha` to reproduce the verdict — a vendor claim or a screenshot is
   not acceptable evidence.

**Governance.** Claude stays the **default** for `ingest-extract` until a **specific** model is
**measured** to clear the calibrated bar on the checked-in golden set, with the reproducible
artifact. "Measured" means a recorded, re-runnable eval — not a claim. Clearing the bar unlocks
**only** the `ingest-extract` tier for **that** model; every other capability tier stays Claude-first
until its own golden set and threshold are defined and measured. Progression is one tier at a time
on measured evidence; a model that later regresses below the bar on a golden-set re-run reverts that
tier to Claude-first. **Ratifying this gate is not greenlighting passage: the Ollama capability
progression stays NO-GO until a measured pass lands.**

**Realization.** The implementation already exists, built to this bar:
`scripts/eval-ingest-extract.sh` (the scoring driver, reusing `verify-ingest.sh` /
`validate-frontmatter.sh` / the `Finding` model), the golden set under `tests/eval/ingest-extract/`
(including the `provenance-trap` case that exercises the floor, and a known-good `extract-basic`
case), the driver's `--self-test`, and the opt-in `eval` selector in `tests/run-tests.sh` that
self-skips without a configured eval model. This ADR records the contract those artifacts implement.

## Alternatives considered

- **Embedding / similarity scoring of candidate vs gold.** Rejected — it violates the absolute
  NO-embeddings non-negotiable (Brief §5) and would smuggle vector similarity in through the test
  layer. Scoring is exact structural comparison: counts and ratios over fields, claims, and
  schema-validity, never latent-space distance.
- **A tunable fabrication threshold (e.g. "≤ 1% fabricated claims").** Rejected. Provenance is the
  §7 non-negotiable; any non-zero tolerance for invented sourced claims is a hole. The
  zero-fabricated-sourced-claims rule is a fixed floor, not a calibratable rate.
- **A CI gate that blocks every PR.** Rejected. The eval depends on an optional local model and is a
  *measurement the PM runs to make a promotion decision*, not a per-PR blocker — it self-skips
  without a configured model. The binding gate is governance (a required, reproducible artifact plus
  PM sign-off on the default-flip), not red CI on unrelated changes.
- **Auto-repair in the eval path (run `fix`/`heal` before scoring schema-validity).** Rejected — it
  would inflate the schema-validity rate by measuring the repairer instead of the model. The
  candidate is scored exactly as emitted.
- **Trust a vendor benchmark or a screenshot of a passing run.** Rejected. The artifact must be
  machine-checkable and **reproduced** by the PM against the cited `golden_set_sha`. Evidence is a
  re-runnable measured artifact, not a claim.
- **A new parallel evaluation framework.** Rejected (one-mechanism discipline). The eval reuses the
  shipped comparators and the existing tier runner; the only new surface is the golden set and a thin
  scoring driver that calls those comparators and tallies.

## Consequences

**Positive.**

- The Ollama progression has a concrete, ratified bar: a model is unlocked for `ingest-extract` only
  on measured, reproducible evidence against a model-neutral golden set — never a vibe or a vendor
  claim.
- NO-RAG holds in the test layer too: scoring is exact structural comparison, so the gate cannot
  become a back door for similarity.
- One mechanism: the eval reuses `verify-ingest.sh`, `validate-frontmatter.sh`, and the `Finding`
  model, so the bar measures exactly the structural correctness the plugin already enforces — no
  second verifier to drift.
- The fail-closed self-test and the provenance trap make the gate trustworthy: it green-lights a
  good model and provably fails a fabricating one, with the gate-13 fail-open as the precedent it is
  built to avoid.

**Negative.**

- **Golden-set authoring and maintenance cost.** The gold reference must be authored to the schema
  by a trusted process and adversarial-reviewed, and grown as tiers expand. Accepted: a small,
  representative, trap-bearing set first; the `golden_set_sha` pins exactly what a run measured.
- **Model-step nondeterminism.** The scoring is fully deterministic; the model's output may vary
  run-to-run. Mitigated by fixing sampling to the most deterministic setting and pinning the run to
  a `golden_set_sha`; the comparison to gold is always exact.
- **Scope is deliberately one tier.** Only `ingest-extract` is gated here; other tiers need their
  own golden set and threshold by the same method. Accepted — narrow first, expand on evidence.

## Revisit when

- A second capability tier (full ingest-write, query, synthesis) is proposed for local-model use.
  Outcome: define that tier's golden set and threshold by the same golden-set method, ratify, and
  extend this ADR — never bypass it.
- Accumulated measured evidence shows the calibrated thresholds are mis-set (too strict or too
  loose) for `ingest-extract`. Outcome: the PM recalibrates the four rates against recorded runs.
  The zero-fabricated-sourced-claims floor is not recalibrated — it is fixed.
- The harness or a comparator changes such that a `golden_set_sha` no longer reproduces a prior
  verdict. Outcome: re-pin the artifact format and re-measure; a default-flip is only valid against a
  reproducible run.
