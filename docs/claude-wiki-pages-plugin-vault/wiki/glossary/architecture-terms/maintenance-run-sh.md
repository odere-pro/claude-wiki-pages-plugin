---
title: "maintenance-run.sh"
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

# maintenance-run.sh

## Definition

The thin host-callable scheduling helper at `scripts/maintenance-run.sh`. Wraps the existing headless maintenance recipe: vault resolution → unattended gate → optional wired-source sync → maintenance loop. Safe to place in a cron schedule; exits 0 on "nothing to do" and on unattended=false. Never creates system cron entries; scheduling is the host's responsibility.

## Key Principles

- The thin host-callable scheduling helper at `scripts/maintenance-run.sh`.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/maintenance-run.sh`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
