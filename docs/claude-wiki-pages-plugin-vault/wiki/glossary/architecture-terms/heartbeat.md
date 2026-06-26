---
title: "heartbeat"
type: concept
aliases: []
parent: "[[architecture-terms|Architecture terms]]"
path: "glossary/architecture-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "architecture-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# heartbeat

## Definition

`scripts/heartbeat.sh` — surfaces a one-line catch-up recommendation at SessionStart when `maintenance.enabled` and a backlog exists. Recommends only; never mutates the vault.

## Key Principles

- `scripts/heartbeat.sh` — surfaces a one-line catch-up recommendation at SessionStart when `maintenance.enabled` and a backlog exists.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/heartbeat.sh`
- `maintenance.enabled`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
