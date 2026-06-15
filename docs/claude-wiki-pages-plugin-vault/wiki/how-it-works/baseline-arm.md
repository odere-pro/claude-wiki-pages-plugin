---
title: "Baseline Arm"
type: concept
aliases: ["Baseline Arm", "baseline arm", "no-scaffolding arm", "generic prompt arm"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[adr-0020-scaffolding-ablation|ADR-0020: The Scaffolding Ablation]]", "[[_sources/features|Features]]"]
related: ["[[scaffolding-ablation|Scaffolding Ablation]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "eval", "scaffolding", "ablation"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Baseline Arm

> [!summary]
> The baseline arm is the control condition in the [[scaffolding-ablation|Scaffolding Ablation]] (ADR-0020). It runs the same model on the same Golden Set inputs but with only a generic prompt: "extract the knowledge into well-organized notes." No schema, no provenance contract, no anti-fabrication rules. The baseline arm's results demonstrate what a capable LLM produces without plugin scaffolding.

## Key Principles

- The baseline arm uses only a generic prompt with no schema, no provenance contract, and no anti-fabrication rules — the exact opposite of the plugin arm.
- Transport (delimiter protocols) is kept identical in both arms so scorers can read outputs the same way; only the contract is the experimental variable.
- The zero-fabrication floor is vacuous in the baseline arm because the baseline never makes sourced claims — a clean floor on the baseline is not evidence against fabrication.
- `schema_validity` and `claim_source_fidelity` are the meaningful metrics for the baseline ingest arm; `frontmatter_field_accuracy` can score 1.0 vacuously when the baseline emits no frontmatter.
- The ablation is a report, not a gate — it measures and documents the scaffolding gap without blocking any tier.

## Examples

Baseline arm ingest prompt (the only prompt content, no plugin scaffolding):

> "Extract the knowledge from the following document into well-organized notes."

Typical baseline arm failure modes observed in the measured `qwen3-coder:30b` run:

- Duplicate pages for the same entity (no dedup instruction)
- Missing `sources:` fields (no provenance contract)
- Schema-invalid or absent frontmatter (no schema excerpt)
- Inconsistent entity naming (no type system enforcing canonical titles)

## Definition

The scaffolding ablation is a controlled experiment that answers: "what does the plugin scaffolding buy, beyond what a capable LLM would produce on its own?" The baseline arm is the control that establishes the unscaffolded baseline.

The baseline arm prompt is intentionally minimal:

> "Extract the knowledge from the following document into well-organized notes."

That is the entire prompt. No:

- Schema excerpt from `CLAUDE.md`
- Provenance contract or `sources:` requirement
- `source_quotes` verbatim rule
- Anti-fabrication hard rules
- Type system (entity, concept, source, index)

## What the Baseline Arm Produces

The baseline arm produces markdown notes that are:

- **Unstructured** — no consistent frontmatter, no type system, no required fields
- **Unattributed** — claims are not linked back to source passages; no `sources:` field
- **Unvalidatable** — the engine's `verify-ingest.sh` has no schema to check against; schema-validity is not a meaningful metric
- **Dedup-naive** — without an explicit dedup rule, the model creates new pages rather than updating existing ones

The baseline arm's zero-fabrication floor is vacuous: because nothing is sourced, there is nothing to fabricate. The provenance trap in the golden set cannot fire because the baseline never makes sourced claims.

## Measurement

Tools: `eval-produce-baseline.sh` (runs the baseline arm against the golden set) and `eval-ablation-report.sh` (compares baseline and plugin arm results). The report is stored in `tests/eval/runs/ablation/` with a `golden_set_sha` for reproducibility.

The ablation is a **report, not a gate.** Unlike the Local Model Quality Gate (which blocks unapproved models), the ablation does not block anything. It is evidence for the plugin's value proposition, not a CI enforcement mechanism.

## Why the Baseline Matters

Without the baseline, the claim "the plugin produces better output" is unverified. The baseline arm makes the comparison concrete: the same model, same inputs, different scaffolding. Any quality difference between the two arms is attributable to the scaffolding, not to the model or the inputs.

The baseline arm's typical failure modes, observed in the measured run:

- Duplicate pages for the same entity (no dedup instruction)
- Missing `sources` fields (no provenance contract)
- Schema-invalid frontmatter (no schema excerpt)
- Inconsistent entity naming (no type system to enforce canonical titles)

## Related Concepts

- Plugin Arm — the treatment condition (full scaffolding) in the ablation
- [[scaffolding-ablation|Scaffolding Ablation]] — the overall experiment design
- Golden Set — the shared input fixtures both arms run against
- Zero-Fabrication Floor — the floor that is enforced in the plugin arm and vacuous in the baseline
