---
title: "Automation"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["reference", "automation", "maintenance"]
aliases: ["Automation"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Automation

## Summary

Documents the maintenance loop: backlog detection via `heartbeat.sh`, autonomous maintenance agent, maintenance config block. Off by default; opt-in.

## Key Claims

- Heartbeat: `scripts/heartbeat.sh` surfaces a one-line catch-up recommendation at SessionStart when `maintenance.enabled` is true and a backlog exists. Recommends only, never mutates.
- Backlog: raw sources without `_sources/` summaries + overdue lint. Detected by `engine backlog` in O(1) (source manifest).
- Maintenance agent (`claude-wiki-pages-maintenance-agent`): runs ingest → curator → polish → lint in one pass, bounded by `maintenance.maxPerRun`.
- `maintenance.enabled`: off by default. The orchestrator dispatches to the maintenance agent when enabled and a backlog exists.
- Catch-up: the manual equivalent — ingest → curator → polish → lint.

## Entities Mentioned

- [[Maintenance Agent]]

## Concepts Covered

- [[Backlog]]
- [[Heartbeat]]
- [[Catch-Up]]
- [[Maintenance Loop]]
