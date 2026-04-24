---
title: "Dataview"
type: entity
entity_type: product
aliases: ["Dataview", "dataview"]
parent: "[[Tools — Index]]"
path: "tools"
sources:
  - "[[Getting Started]]"
  - "[[Check the Dashboard]]"
  - "[[Query the Wiki]]"
related: ["[[Obsidian]]", "[[llm-wiki-stack]]"]
tags: ["tool", "obsidian-plugin"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.8
---

# Dataview

## Overview

Obsidian community plugin that treats frontmatter as a queryable database. Powers `vault/wiki/dashboard.md` with tables of pages by type, confidence, status, and last-updated date; surfaces orphan sources and stale pages.

## Key Facts

- Uses a SQL-like query language (DQL) plus a JavaScript API.
- Renders live inside Obsidian; does not render in plain markdown viewers or CLI.
- For a static snapshot, the `/llm-wiki-stack:obsidian-cli` skill can render a Dataview query to a markdown file.

## Related

- [[Obsidian]] — the host editor.
- [[llm-wiki-stack]] — produces the frontmatter Dataview queries against.
