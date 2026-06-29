---
title: "offline draft"
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

# offline draft

## Definition

A `_proposed/` draft produced with zero dependence on Claude Code by `scripts/offline-draft.sh`, which calls a local model directly and writes through the one `_proposed/` channel for later review-gate promotion. The true-offline counterpart to the in-session `local-ingest-stub`. See ADR-0018.

## Key Principles

- A `_proposed/` draft produced with zero dependence on Claude Code by `scripts/offline-draft.sh`, which calls a local model directly and writes through the one `_proposed/` channel for later review-gate promotion.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `_proposed/`
- `scripts/offline-draft.sh`
- `local-ingest-stub`

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, approved local model, offline policy, reachability probe, degraded-mode routing, query tier.
