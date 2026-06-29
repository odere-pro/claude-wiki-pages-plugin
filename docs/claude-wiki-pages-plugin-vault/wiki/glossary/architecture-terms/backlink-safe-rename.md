---
title: "backlink-safe rename"
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

# backlink-safe rename

## Definition

Renaming/moving a wiki page via `scripts/obsidian-rename.sh` (Obsidian's `app.fileManager.renameFile()`), which updates every `wikilink` backlink from the metadata cache. Exit 0 = renamed + verified on disk; exit 3 = skip, caller falls back to `git mv` + manual link rewrite.

## Key Principles

- Renaming/moving a wiki page via `scripts/obsidian-rename.sh` (Obsidian's `app.fileManager.renameFile()`), which updates every `wikilink` backlink from the metadata cache.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/obsidian-rename.sh`
- `app.fileManager.renameFile()`
- `wikilink`
- `git mv`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent.
