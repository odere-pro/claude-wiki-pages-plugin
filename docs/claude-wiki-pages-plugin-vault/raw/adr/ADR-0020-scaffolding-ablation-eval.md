# ADR-0020: The scaffolding ablation — measuring what the plugin buys over plain LLM extraction

- **Status:** Accepted (2026-06-12)
- **Date:** 2026-06-12
- **Builds on:** [ADR-0011](./ADR-0011-local-model-quality-gate.md) (the measurement apparatus and evidence convention), [ADR-0017](./ADR-0017-fabrication-floor-verbatim-partition.md) (the amended fabrication floor), [ADR-0019](./ADR-0019-query-tier-and-answer-verification.md) (the query tier scorer)
- **Anchor:** §5 (NO-RAG, absolute); §7 (provenance, non-negotiable)

## Context

The plugin's claim is that its scaffolding — the schema contract, the
provenance/`source_quotes` rules, the citation protocol, the anti-fabrication
hard rules — is what turns a capable LLM into a reliable wiki maintainer. Until
now that claim was architectural, not measured. The question users actually
ask is: *what do I lose if I just ask the model to "take notes" without the
plugin?*

The existing apparatus already measures one arm of that comparison: the
**plugin arm** (the produce prompts in `eval-produce-ollama.sh` /
`eval-produce-ollama-query.sh`, scored by the model-neutral scorers
`eval-ingest-extract.sh` / `eval-query.sh`). What was missing is the control.

## Decision

### 1. The method: ablate the contract, keep the transport

The evaluation is a **scaffolding ablation**: the same model, the same golden
inputs, two prompt arms; the prompts are the only ablated variable.

- **Plugin arm** — the full scaffolding prompts: authoritative schema excerpt
  (required-fields table + enum list), the provenance contract, the verbatim
  `source_quotes` rule, the anti-fabrication hard rules, and (query) the
  grounding/attribution/coverage-honesty rules.
- **Baseline arm** — the generic prompt a user would write without the plugin:
  *"Extract the knowledge from this document into well-organized markdown
  notes under wiki/"* and *"Answer the question from these notes."*

Both arms keep the **transport** — the delimiter protocols (`===FILE:` blocks;
`===ANSWER===`/`===COVERAGE===`/`===CITATIONS===`/`===END===`). This is a
deliberate measurement decision, not a leak of scaffolding into the baseline:
the scorers fail closed (rc 2 = unscorable) on transport violations, and an
unscorable baseline measures nothing. The transport is how we *read* the
model's answer; the contract is what the plugin *teaches* it. Only the latter
is the experimental variable.

### 2. The apparatus

- `scripts/eval-produce-baseline.sh` — the baseline-arm produce step. Sources
  `parse_response` (fail-closed `===FILE:` parser) from
  `eval-produce-ollama.sh` and `query_ollama_chat` (deterministic `/api/chat`,
  temp 0 / seed 42, exponential timeout backoff) from
  `eval-produce-ollama-query.sh`, so the two arms share parser and network
  path byte-for-byte and differ only in prompts.
- `scripts/eval-ablation-report.sh` — the arms × tiers × cases matrix. A
  **report, never a gate** (the `eval-compare-ollama.sh` stance): scorer
  verdicts rc 0/1 are both legitimate measurements — a baseline arm is
  *expected* to fail the bar, and that gap **is** the result. Scorer rc ≥ 2
  (the output violated the answer protocol itself) is recorded as an
  explicitly labeled **unscorable** cell carrying the scorer's reason — never
  silently dropped, never rendered as a number. In an ablation, baseline
  protocol drift to unscorable is itself a finding: the hard rules being
  ablated are what held the model on-protocol (and the measured run produced
  exactly this — see Results). A corrupt score file at render time stays
  fatal: that is apparatus damage, not model behavior. `--render-only`
  re-renders from committed score files with no network.
- The scorers are untouched. The verdict authority does not move.

### 3. Baseline metric semantics (the vacuous-floor nuance)

Two metrics read differently on a baseline-shaped candidate, and the numbers
must not be over-claimed:

- **`fabricated_sourced_claims == 0` is vacuously clean** for an arm that
  sources nothing: a candidate with no `source_quotes` makes no *sourced*
  claims, so the floor cannot trip. A clean floor on the baseline arm is *not*
  evidence the baseline doesn't fabricate — it is evidence the baseline makes
  **unauditable** claims. The plugin arm's clean floor, by contrast, is earned
  against actual sourced claims.
- **`frontmatter_field_accuracy` can score 1.0 vacuously** when the candidate
  emits no frontmatter at all (no fields scored → nothing wrong). Same logic.

Baseline headline metrics are therefore **`schema_validity` and
`claim_source_fidelity`** (and for query, `citation_recall` /
`quote_coverage` / `fabricated_citations`, which are *not* vacuous — the
protocol forces the baseline to cite, and its citations are checked against
the real pages). The committed fixture
`tests/eval/ingest-extract/cases/extract-basic/candidate-baseline-shape/`
(well-organized notes, zero frontmatter) pins the robustness contract: this
shape scores **rc 1 — a measured FAIL with a full scorecard — never rc 2**.

### 4. Evidence

Two evidence classes, deliberately distinguished:

- **Canonical (reproducible):** local `qwen3-coder:30b` (the sole allow-listed
  model), both arms, both tiers, produced with deterministic options and
  committed under `tests/eval/runs/<tier>/qwen3-coder-30b-baseline/` next to
  the existing plugin-arm runs (`.../qwen3-coder-30b/`). Ingest cells carry
  ADR-0011 `--stamp` artifacts and re-verify with `--verify-artifact`.
- **Supplementary (non-reproducible):** one Claude-executed run of both arms'
  prompts on the same golden inputs, scored by the same scorers, committed
  under `tests/eval/runs/<tier>/claude-arm/` with a `NON-REPRODUCIBLE.md`
  caveat (model version + date; no seed control; the operator had repo
  access, so it is not contamination-controlled). It contextualizes the
  ablation on a frontier model; it is not gate evidence.

### 5. What this is not

- Not a gate: no threshold moves, no tier unlocks or locks based on the
  ablation. ADR-0011 evidence rules are unchanged.
- Not a model comparison: both arms run the same model per run; cross-model
  conclusions need their own runs.
- Not RAG: scoring remains exact structural comparison (§5).

## Measured results (qwen3-coder:30b, M1 Pro, Ollama 0.30.7)

See `docs/features.md` § "Measured: with and without the plugin" for the
rendered matrix with per-cell artifact links. Headline (golden set, both
cases per tier):

- **ingest-extract:** plugin arm PASSes the calibrated bar (schema 1.0,
  fidelity 1.0); the baseline arm emits readable notes with no schema, no
  provenance, and no auditable claims — schema_validity and
  claim_source_fidelity collapse (FAIL), and every factual claim it makes is
  uncited by construction.
- **query:** the plugin arm PASSes (grounded, verbatim-cited, honest
  coverage); the baseline arm loses the grounding/attribution guarantees the
  hard rules carry — its citations are unchecked paraphrases unless the model
  happens to quote verbatim.

## Consequences

- "What does the plugin buy?" now has a numbers-backed answer with committed,
  re-scorable evidence, rendered in `docs/features.md`.
- The baseline produce step gives any future model a one-command control arm:
  `eval-ablation-report.sh --model <m>`.
- Glossary gains **scaffolding ablation**, **plugin arm**, **baseline arm**.
