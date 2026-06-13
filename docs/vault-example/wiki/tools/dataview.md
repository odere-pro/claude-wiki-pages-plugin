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

An Obsidian community plugin that provides a query language (DQL) for frontmatter fields, powering the live dashboard at `vault/wiki/dashboard.md`.

## Overview

Dataview turns frontmatter into a queryable database inside Obsidian. Each code block in `dashboard.md` is a DQL statement that Dataview evaluates against the vault's frontmatter at render time. The result is a live table that updates as the wiki changes — no manual maintenance required.

Without Dataview installed and enabled, the dashboard queries render as empty code blocks. Install it from Obsidian's Community Plugins panel, then enable it. The dashboard page does not need editing after that.

## Key Facts

Five dashboard sections powered by Dataview:

1. All pages by type — every page with type, status, confidence, path, updated, update_count. Sort by confidence to surface weakly-evidenced claims.
2. Sources — all source summaries in `wiki/_sources/`, flagging orphans (not cited by any wiki page) at the bottom.
3. Topic tree — per-folder page counts; flat-folder sprawl (> 12 direct children) is visible here.
4. Contradictions — pages with non-empty `contradicts:` frontmatter.
5. Stale candidates — pages with low `update_count` and an old `updated:` date.

Custom queries follow the same DQL pattern. An example that surfaces low-confidence concept pages:

```
TABLE confidence, updated
FROM "wiki/patterns"
WHERE type = "concept" AND confidence < 0.7
SORT confidence ASC
```

Queries scope naturally to any frontmatter field — type, status, confidence, path, parent, update_count, and custom fields added to the schema.

## Related

- [[Obsidian]] — the host application Dataview runs inside.
- [[Dashboard Monitoring]] — the workflow that uses Dataview's live tables to track vault health.
