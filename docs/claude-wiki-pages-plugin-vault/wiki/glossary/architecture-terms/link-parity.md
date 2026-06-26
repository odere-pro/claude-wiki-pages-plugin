---
title: "link parity"
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

# link parity

## Definition

The advisory doctor check (D11 + the `doctor.sh` NOTE twin) that asks a running Obsidian for its `unresolvedLinks` count and compares it against the wiki's link health. Any CLI failure is a skip, never a fail; a non-zero count points at `/claude-wiki-pages:lint`.

## Key Principles

- The advisory doctor check (D11 + the `doctor.sh` NOTE twin) that asks a running Obsidian for its `unresolvedLinks` count and compares it against the wiki's link health.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `doctor.sh`
- `unresolvedLinks`
- `/claude-wiki-pages:lint`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
