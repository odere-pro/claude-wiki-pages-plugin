---
title: "ADR-0020: The Scaffolding Ablation"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "eval", "scaffolding", "ablation"]
aliases: ["ADR-0020: The Scaffolding Ablation"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0020: The Scaffolding Ablation

## Summary

Defines the scaffolding ablation evaluation: the same model, same golden inputs, two prompt arms — plugin arm (full scaffolding) vs baseline arm (generic prompt). Measures what the plugin scaffolding buys over plain LLM extraction. A report, never a gate.

## Key Claims

- Plugin arm: full schema excerpt, provenance contract, verbatim `source_quotes` rule, anti-fabrication hard rules.
- Baseline arm: generic prompt ("extract the knowledge into well-organized notes") — no schema, no provenance contract.
- The baseline arm's zero fabrication floor is vacuous (nothing it claims is sourced).
- Measured results in `docs/features.md`: the plugin arm significantly outperforms baseline on schema-validity, fidelity, dedup, and field accuracy.
- Tools: `eval-produce-baseline.sh` + `eval-ablation-report.sh`.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Scaffolding Ablation]]
- [[Plugin Arm]]
- [[Baseline Arm]]
- [[Golden Set]]
