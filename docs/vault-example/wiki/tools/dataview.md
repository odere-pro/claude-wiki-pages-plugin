---
title: "Dataview"
type: entity
entity_type: tool
aliases: ["Dataview"]
parent: "[[Tools]]"
path: "tools"
sources:
  - "[[Check the Dashboard]]"
  - "[[Query the Wiki]]"
related:
  - "[[Obsidian]]"
  - "[[Dashboard Monitoring]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Dataview

Dataview is an Obsidian community plugin that provides a query language (DQL) for frontmatter fields. It powers the live dashboard at `vault/wiki/dashboard.md`.

## What it enables

- Tables of all wiki pages filtered by type, status, confidence, path, and update date.
- Source orphan detection (sources not cited by any wiki page).
- Topic-tree page counts and flat-folder sprawl detection (> 12 direct children).
- Contradiction surfacing (pages with non-empty `contradicts:` frontmatter).
- Stale candidate detection (low `update_count` + old `updated:` date).

## Example query

```
TABLE confidence, updated
FROM "wiki/patterns"
WHERE type = "concept" AND confidence < 0.7
SORT confidence ASC
```

Without Dataview, the dashboard queries render as empty code blocks. Install and enable it in Obsidian (Community plugins → Dataview).
