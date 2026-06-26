---
title: "approved local model"
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

# approved local model

## Definition

A local model that cleared the ADR-0011 ingest-extract quality gate with committed, reproducible evidence and is therefore on the `APPROVED_LOCAL_MODELS` allow-list the engine enforces fail-closed. `qwen3-coder:30b` is the only one today; tested-and-rejected models are documented in local-models.md.

## Key Principles

- A local model that cleared the ADR-0011 ingest-extract quality gate with committed, reproducible evidence and is therefore on the `APPROVED_LOCAL_MODELS` allow-list the engine enforces fail-closed.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `APPROVED_LOCAL_MODELS`
- `qwen3-coder:30b`

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, offline policy, reachability probe, degraded-mode routing, offline draft, query tier.
