---
title: "Check the Dashboard"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Check the Dashboard"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

Documents the Obsidian Dataview dashboard at `vault/wiki/dashboard.md`. Covers what each section shows (all pages by type, sources, topic tree, contradictions, stale candidates), when to consult the dashboard, how to produce a static snapshot with the Obsidian CLI, and how to act on common findings.

## Key Claims

- The dashboard requires Obsidian with the Dataview community plugin; without Dataview, queries render as empty code blocks.
- Sections: all pages by type (with type, status, confidence, path, updated, update_count), sources (including orphans), topic tree (per-folder page counts), contradictions (non-empty `contradicts:`), stale candidates.
- A flat folder with > 12 direct children should trigger `/claude-wiki-pages:fix`.
- `confidence: 1.0` rows that were not honestly set should be corrected via lint.
- The Obsidian CLI can render a Dataview query and write the result to `vault/wiki/dashboard-snapshot.md`.

## Entities Mentioned

- [[Obsidian]]
- [[Dataview]]
- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Dashboard Monitoring]]
- [[Provenance-Tracked Wiki]]
- [[Validation and Repair]]
