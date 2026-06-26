---
title: "scaffolding ablation"
type: concept
aliases: []
parent: "[[capability-model-terms|Capability and model terms]]"
path: "glossary/capability-model-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "capability-model-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# scaffolding ablation

## Definition

The evaluation that measures what the plugin buys over plain LLM extraction: the same model, the same golden inputs, two prompt arms — the contract (schema, provenance, citation rules) is ablated, the transport (delimiter protocols) is kept so the scorers can read both arms. Driven by `eval-produce-baseline.sh` + `eval-ablation-report.sh`; a report, never a gate. See ADR-0020.

## Key Principles

- The evaluation that measures what the plugin buys over plain LLM extraction: the same model, the same golden inputs, two prompt arms — the contract (schema, provenance, citation rules) is ablated, the transport (delimiter protocols) is kept so the scorers can read both arms.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `eval-produce-baseline.sh`
- `eval-ablation-report.sh`

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, approved local model, offline policy, reachability probe, degraded-mode routing, offline draft.
