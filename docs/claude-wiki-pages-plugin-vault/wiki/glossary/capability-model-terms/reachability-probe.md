---
title: "reachability probe"
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

# reachability probe

## Definition

The deterministic Layer 4 check (`scripts/reachability.sh`) that reports, as JSON, whether the local Ollama endpoint and the Anthropic API are reachable. It performs no network call when `offlinePolicy` is `off`, and fails closed (reports unreachable) on any error. Consumed by the SessionStart degraded-mode note and the offline draft path. See ADR-0018.

## Key Principles

- The deterministic Layer 4 check (`scripts/reachability.sh`) that reports, as JSON, whether the local Ollama endpoint and the Anthropic API are reachable.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/reachability.sh`
- `offlinePolicy`
- `off`

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, approved local model, offline policy, degraded-mode routing, offline draft, query tier.
