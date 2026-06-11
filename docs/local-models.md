# Local models — what's tested and what works

The plugin can use a local model (Ollama / LM Studio) for the `ingest-extract`
capability tier, but only a model that has **passed the ADR-0011 quality gate**
with committed, reproducible evidence. This is an allow-list, enforced in code:
`APPROVED_LOCAL_MODELS` in [`src/data/config/config.ts`](../src/data/config/config.ts).
`claude-wiki-pages config validate` fails closed if `localModel.enabled` is true
and the configured `model` is not on the list.

Claude Code stays primary for every tier regardless; local-model use is opt-in,
off by default, and (for drafting) always routed through the `_proposed/` human
review gate. See [ADR-0011](./adr/ADR-0011-local-model-quality-gate.md) for the
gate design and [ADR-0017](./adr/ADR-0017-fabrication-floor-verbatim-partition.md)
for the fabrication-floor definition.

## Approved

| Model | Tier | Evidence |
| --- | --- | --- |
| **`qwen3-coder:30b`** | `ingest-extract` | [`tests/eval/runs/ingest-extract/qwen3-coder-30b/`](../tests/eval/runs/ingest-extract/qwen3-coder-30b/) — both golden-set cases pass, `--verify-artifact` reproducible |

## Tested and rejected

Measured 2026-06-11 on Ollama 0.30.7 (Apple M1 Pro, 32 GB), all six pulled
models × the two golden-set cases. The bar: schema-validity ≥0.98 ·
claim-source-fidelity ≥0.97 · frontmatter-field-accuracy ≥0.90 ·
dedup-correctness ≥0.90 · **zero fabricated sourced claims** (hard floor). A
model must clear **both** cases. Full report and raw scorecards: `tmp/eval-report/`.

| Model | Verdict | Why it did not work |
| --- | --- | --- |
| `qwen3.5:27b` | ❌ rejected | The strongest near-miss. Perfect schema, fidelity, and field accuracy; invents nothing. Fails **dedup** (0.33 / 0.00): it emits **more pages than the gold page-set** — a page-cardinality problem, not a provenance one. The most promising future candidate; a dedup-focused prompt or a post-extract page-merge could plausibly clear it. |
| `gemma4:31b` | ❌ rejected | **dedup 0.00 on both cases** — emits the wrong set of pages (extra/missing vs the expected 5) — and **schema-validity 0.63** on extract-basic (several pages have frontmatter that is invalid as-emitted). Reproduces the gold claims faithfully (fidelity 1.0) and invents nothing, but cannot produce the exact, schema-clean page structure the gate requires. |
| `gemma4:26b` | ❌ rejected | **Output-protocol unstable**: on extract-basic it emitted a malformed file stream (an unterminated `===FILE:` block), which the fail-closed parser rejected outright (no scoreable candidate). On the case it did emit, **schema-validity 0.13** — almost every page invalid. Invents nothing, but is the least reliable at following the structured-output contract. |
| `qwen3-vl:30b` | ❌ rejected | Wrong tool: a **vision-language** model on a pure-text extraction task. **claim-source-fidelity 0.00 on extract-basic** (reproduced none of the gold claims) and schema 0.43–0.71. Not a candidate for this workload. |
| `gpt-oss:20b` | ❌ rejected | The **only model that fabricated** — it invented a sourced claim on `provenance-trap` (fell for the trap the case is designed to catch), tripping the zero-fabrication floor. Also weak structurally (schema 0.00–0.43). The least safe of the set for provenance specifically. |

### The pattern

Five of six models invent **nothing** — provenance discipline (the §7
non-negotiable) is widespread among modern local models. The real wall is
**structural**: producing exactly the right page-set (`dedup`) with
schema-valid frontmatter as-emitted (`schema-validity`), and following the
output protocol without drift. `qwen3-coder:30b` clears it because code-tuned
models are strong at exact structured output (YAML/frontmatter, file layout).
The one genuine safety outlier is `gpt-oss:20b`, the only model to fabricate.

## Adding a model

The allow-list is meant to grow as models are measured — it is not a fixed
endorsement of one vendor. To qualify a new model:

```bash
# 1. Measure it against the golden set (exponential-backoff retries for slow models)
bash scripts/eval-compare-ollama.sh --models "<name:tag>" --retries 2

# 2. If it PASSES both cases, copy its candidates into the evidence tree,
#    stamp + verify the artifacts (one per case):
mkdir -p tests/eval/runs/ingest-extract/<slug>
cp -R tmp/eval-candidates/<slug>/<case> tests/eval/runs/ingest-extract/<slug>/<case>
bash scripts/eval-ingest-extract.sh --stamp \
  --score tests/eval/runs/ingest-extract/<slug>/<case> \
  --gold  tests/eval/ingest-extract/cases/<case>/expected \
  --input tests/eval/ingest-extract/cases/<case>/input.md \
  --model-id "ollama:<name:tag>" \
  > tests/eval/runs/ingest-extract/<slug>/<case>.artifact.json
bash scripts/eval-ingest-extract.sh --verify-artifact \
  tests/eval/runs/ingest-extract/<slug>/<case>.artifact.json
```

Then add the exact `name:tag` to `APPROVED_LOCAL_MODELS` in
[`src/data/config/config.ts`](../src/data/config/config.ts), add a row to the
**Approved** table above, and commit the evidence in the same change. Per
ADR-0011 governance, the unlock is per-model and per-tier — no blanket "Ollama
is ready" claim, and a model that later regresses on a re-run is removed by the
reverse edit.
