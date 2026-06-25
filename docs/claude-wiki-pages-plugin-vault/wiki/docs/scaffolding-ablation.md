---
title: "Scaffolding Ablation"
type: concept
aliases: ["scaffolding ablation", "Scaffolding Ablation", "plugin vs baseline", "ablation eval"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-features|Features]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "evaluation", "features"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Scaffolding Ablation

A measured comparison of the plugin's full scaffolding vs a generic prompt, run on the same model with the same golden inputs, to quantify what the scaffolding buys.

## Definition

The scaffolding ablation (ADR-0020) runs the same model on the same golden inputs through two prompt arms: the plugin arm (full schema + provenance contract + citation rules) and the baseline arm (generic "extract the knowledge into well-organized notes" prompt). Both arms are scored by the same fail-closed scorers.

## Key Principles

**Canonical arms.** `qwen3-coder:30b` (deterministic options; ingest cells carry stamped, `--verify-artifact`-reproducible artifacts). Claude claude-fable-5 is a supplementary run (non-reproducible, caveat noted).

**ingest-extract tier results (bar: schema ≥ 0.98, fidelity ≥ 0.97, fields ≥ 0.90, dedup ≥ 0.90, fabricated = 0):**

| Metric | Plugin arm | Baseline arm |
| --- | --- | --- |
| `schema_validity` | 1.00 / 1.00 | 0.00 / 0.00 |
| `claim_source_fidelity` | 1.00 / 1.00 | 0.00 / 0.00 |
| `frontmatter_field_accuracy` | 0.93 / 0.93 | 1.00¹ / 1.00¹ |
| `dedup_correctness` | 1.00 / 1.00 | 0.00 / 0.00 |
| `fabricated_sourced_claims` | 0 / 0 | 0¹ / 0¹ |
| **Verdict** | **PASS / PASS** | **FAIL / FAIL** |

¹ Vacuous: baseline has no frontmatter to mis-fill and no sourced claims to fabricate. Its clean floor means claims are **unauditable**, not honest.

**query tier results:** plugin arm PASS on query-basic and query-trap; baseline arm unscorable on query-basic (citations drifted off `[[wikilink]]` protocol).

**What the scaffolding buys.** Without the plugin: schema_validity 0.00 (no schema), claim_source_fidelity 0.00 (zero auditable claims), dedup_correctness 0.00 (page-set unstable). Every number is re-derivable with the scorers in `scripts/`.

**Reproduce:** `bash scripts/eval-ablation-report.sh --model <model>`

## Examples

The baseline arm's `fabricated_sourced_claims = 0` is vacuous because the baseline emits no frontmatter at all — there are no sourced claims to fabricate. This is why the plugin arm's zero fabrication is meaningful (there are 20+ sourced claims per case, each checked against the source) and the baseline's is not.

## Related Concepts

ADR-0020 is the full decision record for the scaffolding ablation. ADR-0017 defines the fabrication floor (verbatim partition). ADR-0011 defines the quality gate used to approve local models.
