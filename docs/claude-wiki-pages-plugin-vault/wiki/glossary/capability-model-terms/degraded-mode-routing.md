---
title: "degraded-mode routing"
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

# degraded-mode routing

## Definition

The deterministic routing decision (the engine `route` command) that, given the offline policy, the configured capability tier, model approval, and reachability, returns whether a task runs on Claude, on an approved local tier, or is BLOCKED. It lives in Layer 4; the orchestrator consults it and never re-derives the decision. The acting form of `degraded mode`. See ADR-0018.

## Key Principles

- The deterministic routing decision (the engine `route` command) that, given the offline policy, the configured capability tier, model approval, and reachability, returns whether a task runs on Claude, on an approved local tier, or is BLOCKED.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `route`
- `degraded mode`

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, approved local model, offline policy, reachability probe, offline draft, query tier.
