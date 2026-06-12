---
title: "ADR-0020 Scaffolding Ablation Eval"
type: concept
aliases: ["ADR-0020 Scaffolding Ablation Eval", "ADR-0020", "scaffolding ablation ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0020-scaffolding-ablation-eval]]"]
related: ["[[Scaffolding Ablation]]", "[[ADR-0011 Local Model Quality Gate]]", "[[Feature Overview]]"]
tags: [adr, evaluation, ablation, scaffolding]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0020: The Scaffolding Ablation — Measuring What the Plugin Buys

**Status:** Accepted | **Date:** 2026-06-12

## Context

The plugin's claim is that its scaffolding — schema contract, provenance/`source_quotes` rules, citation protocol, anti-fabrication hard rules — turns a capable LLM into a reliable wiki maintainer. Until this ADR, that claim was architectural, not measured. The question users ask: *what do I lose if I just ask the model to "take notes" without the plugin?*

## Decision

**The scaffolding ablation** runs the same model on the same golden inputs through two prompt arms:

- **Plugin arm** — the full plugin prompt: authoritative schema excerpt, provenance contract, verbatim `source_quotes` rule, anti-fabrication and grounding hard rules.
- **Baseline arm** — the generic prompt without the plugin ("extract the knowledge into well-organized notes", "answer the question from these notes").

Both arms use the same model-neutral scorers (from ADR-0011/0019) so the measurement is apples-to-apples.

**Key finding:** `schema_validity` drops from 1.00 to 0.00 without the plugin. `claim_source_fidelity` drops from 1.00 to 0.00. `dedup_correctness` drops from 1.00 to 0.00. The baseline's clean zero-fabrication floor is vacuous — no frontmatter means no sourced claims to fabricate. The claims are unauditable, not honest.

**This is a report, not a gate.** The ablation is run on demand (`bash scripts/eval-ablation-report.sh --model <model>`) and produces an evidence report. It does not block CI.

**ADR convention:** The ablation is the first "measurement-only" ADR — it records a measurement methodology and its results, not a design decision or a new mechanism. The measurement is reproducible (deterministic options on `qwen3-coder:30b`; stamped, `--verify-artifact`-reproducible artifacts).
