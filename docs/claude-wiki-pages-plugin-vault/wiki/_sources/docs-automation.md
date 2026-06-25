---
title: "Automation"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "automation"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Automation

## Metadata

- File: `raw/repo/docs/automation.md`
- Type: operations guide

## Summary

Describes the three-layer opt-in vault automation: backlog detection (deterministic), heartbeat (SessionStart recommendation), and maintenance loop (LLM step via maintenance-agent). Includes scheduled upkeep via host-owned cron using maintenance-run.sh.

## Key Claims

Three automation layers, all opt-in: (1) engine backlog reports unprocessed sources and overdue lint deterministically; (2) heartbeat.sh runs at SessionStart and prints one-line catch-up recommendation (never mutates vault); (3) maintenance-agent runs full ingest → curator → polish → lint pass when maintenance.enabled. Nothing autonomous runs without maintenance.enabled: true. Config fields: enabled, autoCatchupOnSessionStart, lintEveryDays, maxPerRun, cooldownMinutes, unattended, syncWiredOnRun. Scheduled upkeep uses host-owned cron with maintenance-run.sh (plugin never creates system cron entries). Full headless recipe: maintenance-run.sh && claude -p "/claude-wiki-pages:wiki" --env CLAUDE_WIKI_PAGES_MAINTENANCE_UNATTENDED=true. Safety: heartbeat never writes; maintenance agent writes only through git-checkpointed agents; uncertain pages route to _proposed/, never auto-promoted; maxPerRun bounds each pass; firewall still confines writes.

Covers: Maintenance Loop, Heartbeat, Backlog Detection, Scheduled Upkeep, maintenance-run.sh
