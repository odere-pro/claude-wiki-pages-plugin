---
title: "wiki-only graph"
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

# wiki-only graph

## Definition

The Obsidian-side contract (ADR-0023): graph, search, and link autocomplete show only generated `wiki/` pages. Enforced by Excluded files (`.obsidian/app.json` `userIgnoreFilters`: `raw/`, `_templates/`, `_proposed/`); color groups query `path:wiki/...` exclusively, topics → specials.

## Key Principles

- The Obsidian-side contract (ADR-0023): graph, search, and link autocomplete show only generated `wiki/` pages.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wiki/`
- `.obsidian/app.json`
- `userIgnoreFilters`
- `raw/`
- `_templates/`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
