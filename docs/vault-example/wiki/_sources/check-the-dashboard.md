---
title: "Check the Dashboard"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "observability"]
aliases: ["Check the Dashboard", "check-the-dashboard"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Check the Dashboard

## Metadata

- **Path in raw/:** `06-check-the-dashboard.md`

## Summary

The Dataview dashboard at `vault/wiki/dashboard.md` surfaces all pages by type, sources and their citation status, the topic tree with page counts, contradictions (pages with non-empty `contradicts:`), and stale candidates (30+ days with low update count). Requires Obsidian plus the Dataview community plugin. Static snapshots can be produced via the Obsidian CLI skill. Tabulates common findings and remediation actions.

## Key Claims

- The dashboard is useful in Obsidian and empty everywhere else — Dataview does not render outside Obsidian.
- A flat folder with >12 direct children is a restructure signal; the `llm-wiki-fix` flat-folder phase handles it.
- `confidence: 1.0` is a default abuse; lint's single-source-high-confidence check flags it.

## Entities Mentioned

- [[Obsidian]]
- [[Dataview]]

## Concepts Mentioned

- [[Hook-Enforced Guarantees]]
