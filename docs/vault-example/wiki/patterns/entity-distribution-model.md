---
title: "Entity Distribution Model"
type: concept
aliases: ["Entity Distribution Model", "entity-distribution-model"]
parent: "[[Patterns — Index]]"
path: "patterns"
sources:
  - "[[Update an Existing Vault]]"
related: ["[[LLM Wiki Pattern]]", "[[Ingest Pipeline]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["pattern", "DRY"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.6
---

# Entity Distribution Model

## Definition

When ingesting a new source, **rewrite or extend existing pages** rather than creating a new page per source. One source touches many pages; a page accumulates many sources. The opposite of a per-source summary model.

## Key Principles

- Before creating a new entity / concept page, search the wiki for existing pages whose `title` or `aliases` match the candidate name. If found, append.
- A new source for an existing entity appends to that page's `sources:` array, increments `update_count`, advances `updated`, and may shift `confidence` (reinforce or weaken).
- Per-source summaries live only in `wiki/_sources/` — one summary per source, never duplicated into typed pages.

## Examples

- Ingesting a second article that mentions Obsidian: the existing `tools/obsidian.md` page gets the new source appended to its `sources:`; no new file is created.
- Ingesting a source that mentions five concepts already in the wiki: five pages get extended; zero new files are created.

## Related Concepts

- [[LLM Wiki Pattern]] — the broader pattern this rule supports.
- [[Ingest Pipeline]] — the workflow that enforces this rule.
