---
title: "Automation (source)"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [automation, maintenance, heartbeat]
aliases: ["Automation (source)"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Automation

## Summary

Describes the three-layer vault automation system: deterministic backlog detection via `engine backlog`, a heartbeat script that surfaces one-line recommendations at SessionStart (never writes), and the maintenance agent that runs the full ingest → curator → polish → lint loop. All three layers are opt-in and off by default via `maintenance.enabled`.

## Key Claims

- Backlog detection: `engine backlog` reports pending raw sources and overdue lint deterministically.
- Heartbeat (`scripts/heartbeat.sh`): surfaces a one-line catch-up recommendation at SessionStart when `maintenance.enabled` and a backlog exists; never ingests or mutates the vault.
- Maintenance loop: `claude-wiki-pages-maintenance-agent` runs ingest → curator → polish → lint in one git-checkpointed pass.
- Config block lives in `.claude/claude-wiki-pages.json` or `~/.config/claude-wiki-pages/config.json`.
- Key config fields: `enabled`, `lintEveryDays`, `maxPerRun`, `cooldownMinutes`.
- A raw file is "pending" when no `wiki/_sources/<stem>.md` summary exists (or when the source manifest marks it `pending` in schema v2).
- The maintenance agent never bypasses `maxPerRun`; remaining backlog is reported, not silently skipped.
- Scheduling is the host's responsibility; the plugin deliberately does not create system cron entries.

## Entities Mentioned

- [[claude-wiki-pages-maintenance-agent]]
- `scripts/heartbeat.sh`
- `scripts/engine.sh`

## Concepts Covered

- [[Automation]]
- [[Backlog Detection]]
- [[Heartbeat]]
- [[Maintenance Loop]]
- [[Catch-Up]]
