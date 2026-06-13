---
title: "Local Model Quality Gate"
type: concept
aliases: ["Local Model Quality Gate", "local model quality gate", "quality gate", "ADR-0011 gate"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0011: Local-Model Quality Gate]]", "[[ADR-0017: Fabrication Floor — Verbatim Partition]]", "[[Local Models]]"]
related: ["[[Golden Set]]", "[[Zero-Fabrication Floor]]", "[[Approved Local Model]]", "[[Capability Tier]]", "[[Offline Policy]]", "[[Scaffolding Ablation]]"]
tags: ["concept", "local-model", "quality"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Local Model Quality Gate

> [!summary]
> The local model quality gate (ADR-0011) is the evaluation methodology that a local model must pass before joining the `APPROVED_LOCAL_MODELS_BY_TIER` allow-list. It uses a checked-in golden set of `(raw input → expected structured output)` pairs, scored by exact structural comparison — never embeddings or similarity. The gate is fail-closed: an unapproved model is blocked with a teaching message, never run silently. One model has passed so far: `qwen3-coder:30b` for the `ingest-extract` and `query` tiers.

## Problem Statement

The plugin's north star is a full Claude→Ollama swap for offline use. But "local model quality" is not defined by a benchmark — it is defined by whether a specific model produces schema-valid, provenance-clean, non-fabricating output on the plugin's actual extraction task. Without a concrete evaluation methodology, "use a local model" is an unverifiable claim.

Two constraints frame the gate design and are non-negotiable:
1. **NO-RAG is absolute (§5).** The evaluation must not score output by embedding it and measuring vector similarity — that would smuggle the forbidden mechanism into the test layer. Correct means structurally equal under a deterministic comparator.
2. **One-mechanism discipline.** The eval extends the apparatus the plugin already owns; it is not a parallel verifier.

## The Gate Design (ADR-0011)

### Golden Set

A fixtures-based golden set lives in `tests/eval/ingest-extract/`: `(raw input, expected structured output)` pairs authored to the schema, adversarial-reviewed, and model-neutral. The set includes a deliberate **provenance trap** — a case authored so that a fabricating model is forced to invent a sourced claim and trip the zero-fabrication floor. The floor is exercised, not merely declared.

The set is identified by a `golden_set_sha` (the git SHA of the fixture files) so every evaluation can be reproduced against exactly the same inputs.

### Four Calibrated Thresholds

A model must clear **all four** over the full golden set:

| Metric | Threshold | What it measures |
| --- | --- | --- |
| Schema-validity | ≥ 0.98 | Pages are valid YAML frontmatter against the schema, as-emitted (no auto-repair before scoring) |
| Claim-source fidelity | ≥ 0.97 | Every extracted claim is present in the gold set; no claims dropped; citations correct |
| Frontmatter-field accuracy | ≥ 0.90 | `type`, enum values, `title`, `parent`, `path`, `sources` — correctly classified and placed |
| Dedup correctness | ≥ 0.90 | The model updates an existing page rather than spawning a duplicate |

**Auto-repair is not run before scoring.** Scoring a model after running `fix`/`heal` on its output would measure the repairer, not the model. The candidate is scored exactly as emitted.

### Zero-Fabrication Floor

A single invented sourced claim fails the tier regardless of all other scores. This is a hard floor, not a calibratable threshold. Provenance fidelity (§7) is a non-negotiable: a model that launders one unsourced claim into a `sources`-bearing page is disqualified even at otherwise perfect scores.

**Over-citation is not fabrication (ADR-0017):** a `source_quotes` pair absent from the gold set but whose quote IS verbatim in the input is extra real citation — the model cited something true that the gold set did not include. This is fine. The floor only fires on invented claims.

### Three Binding Build Conditions

1. The golden set is model-neutral and adversarial-reviewed, and includes the provenance trap.
2. The scoring driver is self-tested fail-closed (`--self-test` passes a known-good fixture and fails a fabricating one; internal errors are fatal, never swallowed).
3. The measured-run artifact is machine-checkable and reproducible (carries `model_id`, `golden_set_sha`, `recorded_at`; the PM re-runs it against the cited SHA to confirm the verdict).

A vendor claim or a screenshot is not acceptable evidence. The artifact must be re-runnable by someone other than the person who produced it.

## Implementation

The gate runs via:
```bash
bash scripts/eval-compare-ollama.sh --models "<name:tag>"
```

It calls the existing `verify-ingest.sh` and `validate-frontmatter.sh` scripts on the candidate output, then tallies results using the `Finding` result model from `src/core/report.ts` — the same shape that `verify` emits on real vault output. No second verifier.

The eval is an opt-in `eval` selector in `tests/run-tests.sh` that self-skips when no local model is configured. CI never hard-fails on a missing model.

## Governance

Passing the gate unlocks **only** the `ingest-extract` tier for **that specific model**. Every other tier stays Claude-first until its own golden set and threshold are defined and measured. Progression is one tier at a time on measured evidence.

A model that later regresses below the bar on a golden-set re-run reverts its tier to Claude-first.

## Measured Results

**`qwen3-coder:30b`** — the only model to pass (measured 2026-06-11):
- Schema-validity: 1.0, Claim-source fidelity: 1.0, Field accuracy: 0.93, Dedup: 1.0
- Zero fabricated sourced claims (provenance trap: not triggered)
- Evidence: `tests/eval/runs/ingest-extract/qwen3-coder-30b/` — `--verify-artifact` reproducible

Rejected models and reasons:
- `qwen3.5:27b` — fails dedup (0.33): emits more pages than the gold set.
- `gemma4:31b/26b` — fails dedup and schema-validity; output protocol unstable.
- `gpt-oss:20b` — **the only fabricator**: invented a sourced claim on the provenance trap.
- `qwen3-vl:30b` — vision model on a text task; claim-source fidelity 0.00.

## Related

- [[Golden Set]] — the checked-in fixtures used for eval scoring
- [[Zero-Fabrication Floor]] — the hard floor for fabricated sourced claims
- [[Approved Local Model]] — the allow-list result of a passed gate
- [[Capability Tier]] — the tier a model is approved for
- [[Scaffolding Ablation]] — the companion eval that measures what the plugin buys vs no plugin
