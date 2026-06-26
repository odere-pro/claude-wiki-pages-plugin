---
title: "scheduled upkeep"
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

# scheduled upkeep

## Definition

Host-owned cron invoking `scripts/maintenance-run.sh` on a cadence to drive the maintenance loop without a human in the loop. Not a plugin-created cron (the plugin cannot own durable cron state outside the vault). The helper resolves the active vault, enforces the unattended gate, optionally pulls wired sources, and records an audit entry in `wiki/log.md`. See `docs/automation.md`.

## Key Principles

- Host-owned cron invoking `scripts/maintenance-run.sh` on a cadence to drive the maintenance loop without a human in the loop.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/maintenance-run.sh`
- `wiki/log.md`
- `docs/automation.md`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
