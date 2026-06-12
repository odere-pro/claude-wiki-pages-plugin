---
title: "Scaffolding Ablation"
type: concept
aliases: ["Scaffolding Ablation", "scaffolding ablation", "ADR-0020", "ablation study"]
parent: "[[Features]]"
path: "features"
sources: ["[[features]]"]
related: ["[[Feature Overview]]", "[[Local Model Quality Gate]]", "[[Approved Local Models]]"]
tags: [features, evaluation, ablation]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Scaffolding Ablation

The scaffolding ablation (ADR-0020) measures what the plugin buys over plain LLM extraction. Same model, same golden inputs, two prompt arms — with and without the plugin's scaffolding (schema, provenance contract, citation rules).

## The Two Arms

- **Plugin arm** — the full prompt: authoritative schema excerpt, provenance contract, verbatim `source_quotes` rule, anti-fabrication and grounding hard rules.
- **Baseline arm** — the generic prompt a user would write without the plugin: "extract the knowledge into well-organized notes" / "answer the question from these notes".

## The Numbers (ingest-extract tier)

Canonical: `qwen3-coder:30b` deterministic; Claude column supplementary.

| Metric | Plugin arm | Baseline arm | Claude plugin | Claude baseline |
| --- | --- | --- | --- | --- |
| `schema_validity` | 1.00 / 1.00 | 0.00 / 0.00 | 1.00 / 1.00 | 0.00 / 0.00 |
| `claim_source_fidelity` | 1.00 / 1.00 | 0.00 / 0.00 | 1.00 / 1.00 | 0.00 / 0.00 |
| `dedup_correctness` | 1.00 / 1.00 | 0.00 / 0.00 | 1.00 / 1.00 | 0.00 / 0.00 |
| **Verdict** | **PASS / PASS** | FAIL / FAIL | PASS / PASS | FAIL / FAIL |

The baseline's clean zero-fabrication floor is **vacuous** — a candidate with no frontmatter has no sourced claims to fabricate. The claims are **unauditable**, not honest.

## What the Scaffolding Buys

| Capability | Enforcing mechanism | Without the plugin |
| --- | --- | --- |
| Schema-valid, typed pages | `validate-frontmatter.sh` PreToolUse gate | `schema_validity` 1.00 → 0.00 |
| Claims traceable to sources | `source_quotes` rule + `verify-ingest.sh` | `claim_source_fidelity` 1.00 → 0.00 |
| Stable page set (dedup, no drift) | Two-pass alias-aware dedup | `dedup_correctness` 1.00 → 0.00 |
| Grounded, verifiable answers | Citation protocol + runtime answer verification | Baseline drifts off-protocol or drops required quote |

## Reproduce

```bash
bash scripts/eval-ablation-report.sh --model qwen3-coder:30b
```
