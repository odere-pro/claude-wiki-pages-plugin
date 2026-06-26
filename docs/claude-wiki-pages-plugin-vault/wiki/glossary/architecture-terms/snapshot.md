---
title: "snapshot"
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

# snapshot

## Definition

Git-bounding an LLM write phase: the engine `snapshot` command (`pre` = checkpoint, `post` = commit) and its degradation wrapper `scripts/snapshot.sh`. Write-path agents call it around their write phases so every vault mutation lands in a revertible commit. Honors `gitCheckpoint.mode`.

## Key Principles

- Git-bounding an LLM write phase: the engine `snapshot` command (`pre` = checkpoint, `post` = commit) and its degradation wrapper `scripts/snapshot.sh`.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `snapshot`
- `pre`
- `post`
- `scripts/snapshot.sh`
- `gitCheckpoint.mode`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
