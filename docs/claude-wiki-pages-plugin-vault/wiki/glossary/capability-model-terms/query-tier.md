---
title: "query tier"
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

# query tier

## Definition

The capability tier (`localModel.tier: "query"`) at which a local model composes cited answers from wiki pages selected by the deterministic search engine. Read-only — it writes nothing. Gated like every tier (ADR-0011/0018) and additionally subject to answer verification at runtime. See ADR-0019.

## Key Principles

- The capability tier (`localModel.tier: "query"`) at which a local model composes cited answers from wiki pages selected by the deterministic search engine.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `localModel.tier: "query"`

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, approved local model, offline policy, reachability probe, degraded-mode routing, offline draft.
