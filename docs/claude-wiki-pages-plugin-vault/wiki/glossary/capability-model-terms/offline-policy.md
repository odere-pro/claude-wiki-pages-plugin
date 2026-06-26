---
title: "offline policy"
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

# offline policy

## Definition

The `localModel.offlinePolicy` config dimension governing local fallback when the network or Claude is unavailable: `strict` (fail if Claude is unreachable, never fall back), `prefer-local` (route an eligible task to an approved local tier when Claude is unreachable), `off` (never probe, never fall back — the default). `prefer-local` honours the per-tier approval gate: an unapproved tier is BLOCKED with a teaching message, never run silently. See ADR-0018.

## Key Principles

- The `localModel.offlinePolicy` config dimension governing local fallback when the network or Claude is unavailable: `strict` (fail if Claude is unreachable, never fall back), `prefer-local` (route an eligible task to an approved local tier when Claude is unreachable), `off` (never probe, never fall back — the default).
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `localModel.offlinePolicy`
- `strict`
- `prefer-local`
- `off`

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, approved local model, reachability probe, degraded-mode routing, offline draft, query tier.
