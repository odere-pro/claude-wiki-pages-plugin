# Plan 0003 — Local-model quality gate (the bar before the Ollama progression)

> **Promoted to [ADR-0011](../adr/ADR-0011-local-model-quality-gate.md) (accepted with calibrated thresholds).** This proposal is superseded by that ADR, which records the ratified gate.

- **Status:** Proposed
- **Date:** 2026-06-05
- **Owner:** Architect (design); PM (ratification + enforcement)
- **Decision anchor:** D7 / §11.7 (model-agnostic, quality-gated Ollama path); roadmap open
  unknown (`docs/plan/0002-agentic-brain-roadmap.md:206-208`)
- **Promotion path:** this `docs/plan/` proposal → ADR once accepted (the ADR records the ratified
  metric + threshold; this file is the proposal it supersedes).

> [!summary]
> The Claude→Ollama capability progression (D7) cannot start until a measured bar exists; the PM
> confirmed the metric does not yet exist (`docs/plan/0002-agentic-brain-roadmap.md:206-208`). This
> proposal defines that bar for the **narrowest** tier first — `ingest-extract` — as a
> fixtures-based **golden set** eval that reuses the existing verify/test machinery
> (`scripts/verify-ingest.sh`, `scripts/validate-frontmatter.sh`, the engine `verify` `Finding`
> model, `tests/fixtures/`, `tests/run-tests.sh`). It scores a local model's extraction by
> **deterministic comparison to expected structured output** — never vector similarity (§5 NO-RAG
> holds absolutely). It sets a numeric pass threshold, keeps Claude the default until a model is
> *measured* to clear it, and hands the PM a single gate to enforce before any Ollama scope widens.

## Context

Decision #7 (`docs/plan/0002-agentic-brain-roadmap.md:35`) makes the full Claude→Ollama swap the
north star, **gated on local models proving stable/accurate/quality output**, widened one
capability tier at a time "only as the bar is met"
(`docs/plan/0002-agentic-brain-roadmap.md:151`). The roadmap's own remaining-unknowns section names
the gap precisely: *"The quality-gate metric for the Claude→Ollama progression [D7]: what eval and
threshold declare a local model 'good enough' for a given capability tier"*
(`docs/plan/0002-agentic-brain-roadmap.md:206-208`). The PM's Phase-3 verdict is CONDITIONAL GO:
this metric is the prerequisite for the entire Ollama story, so it must be designed and ratified
before any progression work begins.

Two hard constraints frame the design:

- **§5 NO-RAG is absolute.** The eval measures **extraction/classification correctness by
  deterministic comparison to a gold reference** — field-by-field, claim-by-claim, schema-valid or
  not. It must never score output by embedding it and measuring vector similarity to a reference;
  that would smuggle the forbidden mechanism in through the test layer. "Correct" here means
  *structurally equal to the expected output under a deterministic comparator*, not *semantically
  close in a latent space*.
- **One-mechanism discipline.** The plugin has no runtime beyond shell/YAML/markdown plus the Bun
  engine, and it already owns a verify/test apparatus: `scripts/verify-ingest.sh` and
  `scripts/validate-frontmatter.sh` (the deterministic structural checkers), the engine `verify`
  command with its `Finding` result model (`src/core/report.ts`, `src/commands/verify/`),
  fixtures under `tests/fixtures/` (e.g. `minimal-vault/`), and the tier runner
  `tests/run-tests.sh`. The eval **extends these**; it does not stand up a parallel evaluation
  system.

The narrowest tier is the right place to start. `ingest-extract` (the glossary-defined sub-step
that reads a raw source and extracts structured entities, concepts, and claims before pages are
written) already has the smallest blast radius because Pc — the `local-ingest-stub`
(`docs/plan/0002-agentic-brain-roadmap.md` Pc; `local-ingest-stub` in `docs/GLOSSARY.md`) — routes
all local-extracted output through the one `_proposed/` human-review gate
(`src/commands/propose/propose.ts`) before anything reaches `wiki/`. A local model that clears the
`ingest-extract` bar still cannot write to the wiki unreviewed. That makes `ingest-extract` the
safe first tier to measure and unlock.

## 1. The eval harness — a golden-set eval on the existing machinery

Add a **golden set** (`docs/GLOSSARY.md`): a checked-in fixtures set of `(raw input → expected
structured output)` pairs, scored by deterministic diff. It lives beside the existing fixtures and
is run by the existing tier runner — not a new framework.

**Shape (reusing `tests/fixtures/` conventions):**

```text
tests/eval/ingest-extract/
├── cases/
│   ├── <case-id>/
│   │   ├── input.md              # the raw source handed to the model under test
│   │   ├── expected/             # the GOLDEN reference: the structured output a correct
│   │   │   ├── _sources/<src>.md #   extraction must produce (frontmatter + claims), authored
│   │   │   └── <topic>/<page>.md #   to the schema in docs/vault-example/CLAUDE.md
│   │   └── expected.scores.json  # per-case expected metric values (the gold scorecard)
│   └── ...
└── README.md                     # how to run; what each metric means
```

**How it runs (offline, deterministic):**

1. **Produce.** For each case, the local model under test performs `ingest-extract` on `input.md`,
   emitting candidate structured output into a scratch vault (the same shape Pc already writes into
   `_proposed/`). This is the *only* model-dependent step; everything after is deterministic.
2. **Score.** A new eval driver (`scripts/eval-ingest-extract.sh`, a thin orchestrator) compares
   the candidate against `expected/` using the **existing comparators**, not new logic:
   - **Schema-validity** via `scripts/validate-frontmatter.sh` and `scripts/verify-ingest.sh` run
     against the candidate output — exactly the checks the plugin already enforces on real ingest.
     A candidate page that fails verify is, by definition, not a correct extraction.
   - **Field-level and claim-level accuracy** via a deterministic diff of candidate vs `expected/`
     frontmatter fields and claim/`sources` pairings (a structured comparator built on the engine's
     existing frontmatter parser and the `Finding` model in `src/core/report.ts`, surfacing
     mismatches as findings — the same result shape verify already emits).
3. **Aggregate.** The driver emits a single JSON scorecard (the same envelope style as the engine's
   `verify` JSON) with the per-metric rates below and a pass/fail verdict against the threshold in
   §3. It self-skips with a clear message when no local model is configured (mirroring how
   `tests/run-tests.sh tier2` self-skips without the `claude` CLI), so CI never hard-fails on a
   missing optional model.

**Where it plugs into the tier runner.** The eval is invoked as an opt-in target of
`tests/run-tests.sh` (an `eval` selector alongside `tier0|tier1|tier2`), gated on a configured local
model and never part of the default merge-gating run. It is a *measurement tool the PM runs to make
a promotion decision*, not a blocking CI gate on every PR — the blocking gate is governance (§4),
not red CI.

**Why this is not a parallel system.** Every comparator is one the plugin already ships
(`validate-frontmatter.sh`, `verify-ingest.sh`, the engine frontmatter parser + `Finding` model);
the fixtures follow the existing `tests/fixtures/` pattern; the runner is the existing
`tests/run-tests.sh`. The new surface is only: the `tests/eval/ingest-extract/` golden set and a
thin scoring driver that *calls* those comparators and tallies. No second evaluator, no embeddings,
no network.

## 2. The per-capability-tier metric — `ingest-extract` (first tier)

"Correct extraction" for `ingest-extract` is defined as four deterministic, measurable rates,
computed by comparing candidate output to the golden `expected/`:

1. **Schema-validity rate** — fraction of candidate pages that pass `scripts/verify-ingest.sh` +
   `scripts/validate-frontmatter.sh` with zero error-severity findings. (Does the model produce
   well-formed pages the plugin would accept at all?)
2. **Frontmatter-field accuracy** — fraction of required frontmatter fields whose candidate value
   exactly matches the golden value, over the fields that carry meaning for extraction: `type`,
   `source_type`/`entity_type` (the `ontology-profile-v1` enums — `docs/vault-example/CLAUDE.md`),
   `title`, `parent`, `path`, and presence-and-correctness of `sources`. (Does it classify and
   place the page correctly?)
3. **Claim↔source fidelity** — fraction of extracted claims that are (a) present in the golden set
   (no fabricated claims) and (b) cite the correct source in `sources`/`source_quotes`, with the
   inverse check that golden claims are not dropped. This is the provenance-completeness property
   (`provenance-completeness`, `docs/GLOSSARY.md`) measured against a gold reference: every claim
   traces to its true raw source, none invented, none lost. (Does it preserve provenance — the §7
   non-negotiable — rather than hallucinate?)
4. **Two-pass dedup correctness** — fraction of cases where the model correctly *updates an existing
   page rather than creating a duplicate* when the input overlaps a page already in the scratch
   vault (the entity-distribution rule, `docs/vault-example/CLAUDE.md` ingest rules step 5). Scored
   as: did the candidate produce the golden set of pages (no spurious duplicates, no missed merges)?

All four are exact-match rates against the golden set — counts and ratios, no similarity, no
embeddings. Each is reported per-case and aggregated; the gold scorecard
(`expected.scores.json`) pins the expected value so the eval itself is regression-tested.

## 3. The numeric threshold — the pass bar, Claude-first until measured

A local model is declared **good enough for the `ingest-extract` tier** only when, over the full
golden set, it meets **all** of:

- **Schema-validity rate ≥ 0.98** — near-total well-formedness; malformed pages are blocked by the
  hooks anyway, so a model that frequently produces them is unusable even behind review.
- **Claim↔source fidelity ≥ 0.95**, with a **hard sub-rule: zero fabricated claims** (a single
  invented claim-with-citation fails the tier regardless of the aggregate). Provenance is the §7
  non-negotiable; a model that launders an unsourced claim into a `sources`-bearing page is
  disqualified even at high aggregate accuracy.
- **Frontmatter-field accuracy ≥ 0.90** — correct classification/placement the large majority of
  the time; the `_proposed/` review gate (§context) absorbs the remainder.
- **Two-pass dedup correctness ≥ 0.90** — the model rarely fragments the wiki with duplicates.

These thresholds are the **proposed** starting bar; ratification (§4) is where the PM may tune the
exact numbers against the first measured runs. The non-negotiable that is *not* tunable is the
zero-fabricated-claims sub-rule — provenance fidelity is a floor, not a dial.

**The Claude-first rule (D7 / §11.7).** The default provider stays **Claude** for `ingest-extract`
until a specific local model is **measured** to clear the bar above on the checked-in golden set.
"Measured" means a recorded eval run, not a vendor claim or a vibe. Clearing the bar unlocks **only**
the `ingest-extract` tier for **that model**; every other capability tier remains Claude-first until
*its own* golden set and threshold are defined and measured. Progression is one tier at a time on
measured evidence (`docs/plan/0002-agentic-brain-roadmap.md:151`) — never a blanket "Ollama is good
now" switch. A model that later regresses below the bar on a golden-set re-run reverts that tier to
Claude-first.

## 4. The governance hook — the gate the PM enforces

Once this proposal is ratified and promoted to an ADR, the eval is the **single gate the PM
enforces before any Ollama scope widens**:

- **No tier unlock without a passing measured run.** Widening local-model scope to a capability
  tier requires a recorded `scripts/eval-ingest-extract.sh` (or the analogous per-tier eval) run on
  the checked-in golden set, meeting that tier's threshold, attached to the change that flips the
  default. No measured pass → no unlock. This is a governance gate (a required artifact + PM
  sign-off), not a red-CI gate on every PR.
- **One mechanism, one source of truth for "good enough."** The threshold lives in the ratified ADR
  and the gold scorecard; there is no second bar in prose or config that could drift from it.
- **Per-tier, additive.** Unlocking the next tier (beyond `ingest-extract`) requires defining that
  tier's golden set and threshold by the same method and ratifying them — a new proposal/ADR,
  extending this one, never bypassing it.
- **Promotion path.** This `docs/plan/0003` proposal records the design; on PM acceptance it is
  promoted to an ADR (the binding record of the ratified metric + threshold), and this file is
  marked superseded-by that ADR. In-flight tuning of the numbers stays here until then.

## Risks and open questions

- **Golden-set authoring cost and bias.** The gold reference must be authored to the schema by a
  trusted process (Claude + human review) so it represents *correct* extraction, not one model's
  habits. Small, representative case set first; grow it as tiers expand.
- **Threshold calibration.** The exact rates (0.98/0.95/0.90/0.90) are a proposed starting point;
  the PM calibrates against the first real runs at ratification. The zero-fabricated-claims sub-rule
  is fixed.
- **Determinism of the model step.** The *scoring* is fully deterministic; the *model's* output may
  vary run-to-run (temperature, sampling). The eval should fix sampling to the most deterministic
  setting available and may average over a small fixed number of runs — but the comparison to the
  golden set is always exact, never similarity-based.
- **Scope creep into other tiers.** This proposal deliberately covers only `ingest-extract`. Other
  tiers (full ingest-write, query, synthesis) are out of scope until each is designed by the same
  golden-set method.

## Definition of done (for the eval itself, when built — not part of this proposal)

- [ ] `tests/eval/ingest-extract/` golden set with a small representative case set + gold scorecard.
- [ ] `scripts/eval-ingest-extract.sh` scoring driver reusing `verify-ingest.sh` /
      `validate-frontmatter.sh` / the engine frontmatter parser + `Finding` model — no new
      comparator logic, no embeddings, no network.
- [ ] An `eval` selector in `tests/run-tests.sh` that self-skips without a configured local model.
- [ ] The four metrics + threshold encoded so the verdict is a single deterministic pass/fail.
- [ ] Ratified ADR recording the metric + threshold; this file marked superseded.
