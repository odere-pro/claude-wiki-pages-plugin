# tests/eval — local-model ingest-extract quality gate

This directory is the measurement apparatus for the local-model `ingest-extract` quality gate: the bar a local model must clear before the Claude → local-model capability progression may widen to the ingest-extract tier. It is **model-neutral and offline** — it wires up no model, makes no network call, and flips no default. It only *scores* an already-emitted candidate extraction against a checked-in gold reference, by **exact structural comparison** — counts and ratios only, never embeddings, vectors, cosine, or similarity (the NO-RAG invariant is absolute here). [`README.md`](./README.md) is the full authority for the metrics, thresholds, and artifact format; this file is the orientation pointer, not a duplicate.

## Shape

- `ingest-extract/cases/` holds the cases. Each has a gold `expected/` reference (a tiny valid vault) plus, for the floor cases, planted-bad candidates (`candidate-fabricates/`, `candidate-drops/`, `candidate-bad-schema/`, `candidate-order-divergent/`) the scorer must catch.
- The driver is [`../../scripts/eval-ingest-extract.sh`](../../scripts/eval-ingest-extract.sh): `--self-test` (proves the gate passes the good fixture and fails every planted-bad one), `--score` / `--gold` (score a candidate), `--json`, `--stamp` (emit a measured-run artifact), `--verify-artifact` (re-derive and assert it reproduces).
- The apparatus self-test runs in Tier 1 via [`../scripts/eval-ingest-extract.bats`](../scripts/) and never needs a model.

## Running

```bash
bash scripts/eval-ingest-extract.sh --self-test    # fail-closed apparatus proof
bash tests/run-tests.sh eval                        # opt-in; SKIP without CLAUDE_WIKI_PAGES_EVAL_MODEL
```

The `eval` tier is opt-in: it self-skips unless `CLAUDE_WIKI_PAGES_EVAL_MODEL` names a model, mirroring how Tier 2 self-skips without the `claude` CLI. The model PRODUCE step is model-specific and intentionally not part of this apparatus — for Ollama it lives in [`../../scripts/eval-produce-ollama.sh`](../../scripts/eval-produce-ollama.sh) (matrix runner: [`../../scripts/eval-compare-ollama.sh`](../../scripts/eval-compare-ollama.sh)); even with a model named, `tests/run-tests.sh eval` only executes the driver's self-test. A measured run requires a committed golden set and a recorded, reproducible artifact — see [`README.md`](./README.md) for the metric bars, the zero-fabrication floor, and the artifact contract.
