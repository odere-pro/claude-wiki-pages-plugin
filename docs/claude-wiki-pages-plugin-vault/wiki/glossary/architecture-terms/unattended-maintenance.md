---
title: "unattended maintenance"
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

# unattended maintenance

## Definition

Scheduled / headless operation mode controlled by `maintenance.unattended` (boolean, default false). Conservative strict subset of the interactive path: deterministic mechanical heals apply directly; uncertain authoring routes to `_proposed/` and is never auto-promoted; Step 3 Optimize is skipped; a non-trivial topic-tree plan aborts to backlog with an `ingest-aborted` log entry; bounded by `maintenance.maxPerRun`. Enabled by setting `maintenance.unattended: true` in the project or user config; the gate for `scripts/maintenance-run.sh`.

## Key Principles

- Scheduled / headless operation mode controlled by `maintenance.unattended` (boolean, default false).
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `maintenance.unattended`
- `_proposed/`
- `ingest-aborted`
- `maintenance.maxPerRun`
- `maintenance.unattended: true`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
