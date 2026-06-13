---
title: "Golden Set"
type: concept
aliases: ["Golden Set", "golden set", "golden-set", "eval fixtures", "golden_set_sha"]
parent: "[[Wiki Engine]]"
path: "engine"
sources: ["[[ADR-0011: Local-Model Quality Gate]]", "[[ADR-0020: The Scaffolding Ablation]]", "[[Local Models]]"]
related: ["[[Local Model Quality Gate]]", "[[Zero-Fabrication Floor]]", "[[Approved Local Model]]", "[[Capability Tier]]", "[[Scaffolding Ablation]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "local-model", "eval", "quality-gate"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Golden Set

> [!summary]
> The golden set is the checked-in fixtures corpus used to evaluate whether a local model is eligible for approval at a given [[Capability Tier]]. It consists of `(raw input → expected structured output)` pairs authored to the schema, adversarial-reviewed, and model-neutral. A `golden_set_sha` (git SHA of the fixture files) makes every evaluation reproducible against exactly the same inputs.

## Definition

The golden set lives in `tests/eval/ingest-extract/` and serves as the evaluation corpus for the [[Local Model Quality Gate]] (ADR-0011). It is:

- **Model-neutral** — authored by humans against the schema, not by any model. No model's output is used as a gold reference.
- **Adversarial-reviewed** — includes deliberate edge cases, boundary conditions, and a provenance trap.
- **Checked in** — committed to git; identified by `golden_set_sha` so any evaluation can be reproduced against exactly the same inputs.

Each fixture pair contains:
- A raw input document (the same material the model would receive at ingest time)
- The expected structured output (schema-valid frontmatter + body matching the gold extraction)

## The Provenance Trap

The golden set includes at least one fixture whose raw input is authored so that a fabricating model is forced to invent a sourced claim in order to produce a plausible answer. This exercises the [[Zero-Fabrication Floor]] directly — if a model trips the trap, it invented a claim, and the floor fires. If it does not trip the trap, the floor is satisfied.

The trap is structural: it is not a trick question but a case where the correct answer requires acknowledging that a certain claim cannot be sourced, and a fabricator will instead invent one. `gpt-oss:20b` is the only model to have tripped the provenance trap in testing.

## Scoring

The evaluation driver compares each model output to the gold fixture using exact structural comparison (not embeddings or similarity). Four metrics are computed over the full golden set:

| Metric | Threshold |
| --- | --- |
| Schema-validity | ≥ 0.98 |
| Claim-source fidelity | ≥ 0.97 |
| Frontmatter-field accuracy | ≥ 0.90 |
| Dedup correctness | ≥ 0.90 |

**Auto-repair is not run before scoring.** Scoring a model after running `fix`/`heal` on its output would measure the repairer, not the model. The candidate is scored exactly as emitted.

## Reproducibility

The `golden_set_sha` is the git SHA of the fixture files directory at the time of the measured run. It is embedded in the evidence artifact at `tests/eval/runs/ingest-extract/<model>/`. Anyone can re-run the evaluation against the cited SHA:

```bash
git checkout <golden_set_sha> -- tests/eval/ingest-extract/
bash scripts/eval-compare-ollama.sh --models "qwen3-coder:30b" --verify-artifact
```

A vendor claim or screenshot is not acceptable evidence. The artifact must be re-runnable by someone other than the person who produced it.

## Relationship to the Scaffolding Ablation

The [[Scaffolding Ablation]] (ADR-0020) uses the same golden set as its measured input. It runs two arms — plugin arm (full scaffolding) and baseline arm (generic prompt) — against the same golden inputs to measure what the plugin buys over plain LLM extraction. The golden set is the common substrate for both the quality gate and the ablation study.

## Related Concepts

- [[Local Model Quality Gate]] — the gate that uses the golden set for tier evaluation
- [[Zero-Fabrication Floor]] — the hard floor exercised by the provenance trap
- [[Approved Local Model]] — the allow-list result of a model passing all golden-set thresholds
- [[Capability Tier]] — the tier a model is evaluated against
- [[Scaffolding Ablation]] — the companion eval that uses the same inputs to measure plugin value
