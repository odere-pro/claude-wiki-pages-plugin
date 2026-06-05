# Local-model quality-gate eval — `ingest-extract` golden set

This directory is the **measurement apparatus** for the local-model quality gate
described in [`docs/plan/0003-local-model-quality-gate.md`](../../docs/plan/0003-local-model-quality-gate.md).
It is the bar a local model must clear before the Claude→Ollama capability
progression (decision D7) may widen to the `ingest-extract` tier.

> [!important]
> This apparatus is **model-neutral**. It wires up no Ollama, no local model, and
> makes no network call. It does not flip any default — Claude stays the default
> provider for `ingest-extract`. It only *scores* an already-emitted candidate
> extraction so the PM can make a promotion decision on measured evidence.

## What it measures

A candidate extraction is scored by **exact structural comparison** to a
checked-in gold reference — counts and ratios, never embeddings, vectors,
cosine, or similarity (§5 NO-RAG is absolute). The four deterministic rates and
the one hard floor (the PM-calibrated bar) are:

| Metric | Bar | What it checks |
| --- | --- | --- |
| `schema_validity` | `>= 0.98` | Fraction of candidate pages that pass `verify-ingest.sh` + `validate-frontmatter.sh` **as emitted** — no auto-repair, no `fix`/`heal` first. |
| `claim_source_fidelity` | `>= 0.97` | Fraction of gold `source_quotes` `(source, quote)` pairs the candidate reproduces. Covers invented, dropped, and mis-cited claims. |
| `frontmatter_field_accuracy` | `>= 0.90` | Fraction of meaningful frontmatter fields (`type`, `entity_type`/`source_type`, `title`, `parent`, `path`, `sources`) that exactly match the gold value. |
| `dedup_correctness` | `>= 0.90` | Did the candidate produce the gold set of page paths — no spurious duplicates, no missed merges? |
| `fabricated_sourced_claims` | `== 0` **(floor)** | A single invented sourced claim **fails the tier** regardless of the aggregate. A fixed, non-tunable floor — not a threshold, not a dial. |

A candidate **passes** only when every threshold holds **and** the fabrication
floor is zero. The verdict is a single deterministic pass/fail.

## Layout

```text
tests/eval/ingest-extract/
├── cases/
│   ├── extract-basic/                  # a clean, in-bar extraction
│   │   ├── input.md                    # the raw source handed to the model
│   │   ├── expected/                   # the GOLDEN reference (a tiny valid vault)
│   │   │   ├── CLAUDE.md                #   schema_version + provenance notes
│   │   │   └── wiki/…                   #   _sources/, topic pages, indexes
│   │   └── expected.scores.json        # the gold scorecard (regression-tests the driver)
│   └── provenance-trap/                # the zero-fabrication floor is exercised here
│       ├── input.md                    #   a source that omits price/license/revenue
│       ├── expected/                   #   correct extraction: nothing invented
│       ├── candidate-fabricates/       #   planted-bad: invents a sourced claim
│       ├── candidate-drops/            #   planted-bad: drops claims below 0.97
│       ├── candidate-bad-schema/       #   planted-bad: schema-invalid as emitted
│       ├── candidate-order-divergent/  #   planted-bad: lowercase/order-divergent
│       │                               #   fabrication (the comm/locale regression)
│       └── expected.scores.json
└── README.md                           # this file
```

The `provenance-trap` case is the load-bearing one: `input.md` deliberately
states no price, license, or company revenue, so a naive extractor that invents
any of those as a sourced claim is caught by the floor rather than merely
asserted against.

`candidate-order-divergent` is a regression guard for a latent fail-open: its
fabricated quote is lowercase-initial and sorts differently under a
case-insensitive UTF-8 locale than under byte order, the exact condition that
once made GNU `comm` abort and (with a swallowed error) silently zero the
fabrication floor on CI. The scorer now uses an order- and locale-independent set
diff, so the floor holds under any locale; the self-test re-runs this case pinned
to `en_US.UTF-8` to prove it.

## How to run

The apparatus needs **no local model** to build or test. Scoring is offline and
deterministic.

```bash
# Score a candidate vault against a gold reference (human-readable):
bash scripts/eval-ingest-extract.sh \
  --score tests/eval/ingest-extract/cases/extract-basic/expected \
  --gold  tests/eval/ingest-extract/cases/extract-basic/expected

# Same, machine-readable scorecard:
bash scripts/eval-ingest-extract.sh --score <candidate> --gold <gold> --json

# Fail-closed self-test: proves the gate PASSES the known-good fixture and
# FAILS each planted-bad fixture. Exits non-zero if any bad fixture slips
# through; exits 0 only when all are caught and the good one passes.
bash scripts/eval-ingest-extract.sh --self-test

# Emit a measured-run artifact (requires a COMMITTED golden set, so the
# golden_set_sha resolves). The model id comes from --model-id or the
# CLAUDE_WIKI_PAGES_EVAL_MODEL env var:
bash scripts/eval-ingest-extract.sh --stamp \
  --score <candidate> --gold <gold> --model-id <model-id> > run.artifact.json

# Re-derive the sha, re-score, and assert the recorded verdict + metrics
# reproduce. Nonzero exit on drift or a missing required field:
bash scripts/eval-ingest-extract.sh --verify-artifact run.artifact.json
```

The opt-in tier runner target self-skips when no model is configured:

```bash
bash tests/run-tests.sh eval        # SKIP without CLAUDE_WIKI_PAGES_EVAL_MODEL
```

The apparatus tests themselves run under Tier 1
(`bats tests/scripts/eval-ingest-extract.bats`) and never require a model.

## The measured-run artifact (required before any default flip)

Per the governance hook in plan 0003 §4, no tier unlock is allowed without a
**recorded, reproducible measured run**. This format is **produced and validated
in code**, not just prose: `--stamp` emits it and `--verify-artifact` checks it
(both covered by `tests/scripts/eval-ingest-extract.bats`). The artifact is the
machine-checkable scorecard, augmented with the **model id**, the **golden-set
commit sha**, a **UTC timestamp**, and the **scored paths**:

```json
{
  "tier": "ingest-extract",
  "verdict": "pass",
  "schema_validity": 0.99,
  "claim_source_fidelity": 0.98,
  "frontmatter_field_accuracy": 0.95,
  "dedup_correctness": 0.93,
  "fabricated_sourced_claims": 0,
  "thresholds": { "schema_validity": 0.98, "claim_source_fidelity": 0.97, "frontmatter_field_accuracy": 0.90, "dedup_correctness": 0.90, "fabricated_sourced_claims_floor": 0 },
  "model_id": "ollama:llama3.1:8b-instruct",
  "golden_set_sha": "<git tree id of tests/eval/ingest-extract at HEAD>",
  "recorded_at": "<ISO-8601 UTC timestamp>",
  "candidate_path": "<repo-relative candidate vault>",
  "gold_path": "<repo-relative gold vault>"
}
```

`--stamp` derives `golden_set_sha` from `git rev-parse HEAD:tests/eval/ingest-extract`
(read-only) — so a **committed** golden set is required; stamping against an
uncommitted golden set fails closed rather than emitting evidence that cannot be
reproduced. `golden_set_sha` is the load-bearing field: `--verify-artifact`
re-derives it, re-runs `--score` on the recorded paths, and asserts the recorded
verdict + every gated metric reproduce — failing closed on any drift or missing
field. The PM re-runs `--verify-artifact` against the cited sha before accepting a
flip. A vendor claim or a vibe is not a measured run.

> [!important] What `--verify-artifact` does and does not cross-check
> It is tamper-evident on the **quality evidence** — the metrics, the verdict,
> and the `golden_set_sha` all re-derive from the committed golden set, so a
> tampered metric, verdict, sha, or a missing/nulled required field is caught and
> fails closed. It does **not** cross-check `model_id` or `recorded_at`: a
> model-neutral driver cannot reconstruct those by re-scoring, so they are
> **operator-asserted labels**. They are bound **externally** by committing the
> artifact to the default-flip change — the git commit makes them immutable and
> auditable (the governance rule already requires the measured-run artifact be
> committed to that change). `--verify-artifact` prints a one-line note saying so.

The produce step itself is out of scope here, by design:

> [!note]
> Producing candidate output from a model is a separate, model-specific step
> that is intentionally **not** shipped here — keeping this apparatus neutral.
> When that step is built for a given model, it writes candidate pages into a
> scratch vault (the same shape `_proposed/` already uses), and this driver
> scores them. The scoring contract above never changes.
