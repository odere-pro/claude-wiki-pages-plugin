---
title: "User Guide 06: Check the Dashboard"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["guide", "dashboard", "obsidian", "dataview"]
aliases: ["User Guide 06: Check the Dashboard"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# User Guide 06: Check the Dashboard

## Summary

The dashboard at `vault/wiki/dashboard.md` is an Obsidian Dataview page. Shows all pages by type, sources, topic tree, contradictions, and stale candidates.

## Key Claims

- Requires Obsidian + Dataview community plugin. Without Dataview, queries render as empty code blocks.
- Dashboard sections: all pages by type (confidence sorting), sources (orphan detection), topic tree (folder page counts), contradictions (non-empty `contradicts:` frontmatter), stale candidates (30+ days, low update_count).
- Use before ingest (baseline), after lint/fix (confirm fixed), before export (spot low-confidence pages), monthly (sweep for staleness).
- Static snapshots: `obsidian-cli` skill can write a Dataview result to `dashboard-snapshot.md`.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]

## Concepts Covered

- Staleness Signal (pages not updated in 30+ days despite newer related sources)
- Confidence Decay (`confidence` weakened when newer sources contradict existing claims)

## Grounded Pages

No content pages currently cite this source directly; this guide covers the Dataview dashboard which is an Obsidian-side feature.
