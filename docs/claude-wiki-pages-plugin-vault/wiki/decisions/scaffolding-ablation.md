---
title: "Scaffolding Ablation"
type: concept
aliases: ["Scaffolding Ablation", "scaffolding ablation", "ablation eval", "plugin arm vs baseline arm"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0020: Scaffolding Ablation]]", "[[Features]]"]
related: ["[[Local Model Quality Gate]]", "[[Golden Set]]", "[[claude-wiki-pages Plugin]]"]
tags: ["concept", "eval", "quality"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Scaffolding Ablation

## Definition

The scaffolding ablation is the evaluation that measures what the plugin scaffolding buys over plain LLM extraction. Same model, same golden inputs, two prompt arms. It is a report, not a gate.

## Key Principles

- **Plugin arm:** full schema excerpt, provenance contract, verbatim `source_quotes` rule, anti-fabrication and grounding hard rules — the contract (schema, provenance, citation rules) is present.
- **Baseline arm:** generic prompt ("extract the knowledge into well-organized notes") — no schema, no provenance contract. Expected to fail the calibrated bar.
- **Transport is kept equal:** delimiter protocols are the same in both arms so the scorers can read both outputs.
- **The baseline arm's zero fabrication floor is vacuous:** nothing it claims is sourced.
- **Tools:** `eval-produce-baseline.sh` + `eval-ablation-report.sh`.
- **Results** (from `docs/features.md`): the plugin arm significantly outperforms baseline on all four metrics (schema-validity, fidelity, field accuracy, dedup).

## Examples

Plugin arm scores for `qwen3-coder:30b`: schema-validity 1.0, fidelity 1.0, field accuracy 0.93, dedup 1.0. Baseline arm scores are substantially lower.

## Related Concepts

- [[Local Model Quality Gate]] — the gate that uses the same golden-set methodology
- [[Golden Set]] — the checked-in fixtures used for both arms
- [[claude-wiki-pages Plugin]] — the plugin whose scaffolding is being measured
