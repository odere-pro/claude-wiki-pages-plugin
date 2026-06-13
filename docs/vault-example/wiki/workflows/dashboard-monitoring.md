---
title: "Dashboard Monitoring"
type: concept
aliases: ["Dashboard Monitoring", "dashboard monitoring", "dashboard"]
parent: "[[Workflows]]"
path: "workflows"
sources:
  - "[[Check the Dashboard]]"
  - "[[Review, Validate, Fix]]"
related:
  - "[[Validation and Repair]]"
  - "[[Dataview]]"
  - "[[Obsidian]]"
  - "[[Provenance-Tracked Wiki]]"
depends_on:
  - "[[Dataview]]"
  - "[[Obsidian]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Dashboard Monitoring

Dashboard monitoring is the practice of consulting the live Obsidian Dataview dashboard (`vault/wiki/dashboard.md`) to track vault health, coverage, and staleness. It complements the automated validation workflow.

## Dashboard sections

| Section | What you learn |
| --- | --- |
| All pages by type | Type, status, confidence, path, updated, update_count. Sort by confidence to surface weak claims. |
| Sources | Which source summaries exist and which are orphans (not cited by any wiki page). |
| Topic tree | Per-folder page counts; flat-folder sprawl (> 12 pages) is visible here. |
| Contradictions | Pages with non-empty `contradicts:` frontmatter. |
| Stale candidates | Pages not updated in 30+ days with low `update_count`. |

## When to consult

- Before ingest — know the current state for mental diffing.
- After lint/fix — confirm warning counts dropped.
- Before an export — spot `confidence < 0.5` pages that should not be cited.
- Monthly — sweep for stale pages and orphan sources.

## Common actions

| Finding | Action |
| --- | --- |
| Many `confidence: 1.0` rows | Run lint; the single-source-high-confidence check will flag them. |
| Orphan sources | Find the right entity/concept page and add the source. |
| Flat folder with > 12 children | Run `/claude-wiki-pages:fix`. |
| `status: stale` pages | Refresh with new sources or set `status: superseded` and link to the replacement. |
