---
title: "_proposed/"
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

# _proposed/

## Definition

The staging directory (`vault/_proposed/`) that holds proposed drafts. A sibling of `wiki/`; sits outside every wiki-scoped check (frontmatter validation, lint, index) until a draft is promoted via `propose approve`. There is exactly one `_proposed/` channel — no second draft mechanism.

## Key Principles

- The staging directory (`vault/_proposed/`) that holds proposed drafts.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `vault/_proposed/`
- `wiki/`
- `propose approve`
- `_proposed/`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
