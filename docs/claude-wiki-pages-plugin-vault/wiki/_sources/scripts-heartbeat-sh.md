---
title: "scripts/heartbeat.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/heartbeat.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/heartbeat.sh

## Summary

Surfaces a one-line maintenance catch-up recommendation when the vault has a backlog of unprocessed raw sources or an overdue lint cycle. Off by default (`maintenance.enabled=false`) so nothing autonomous runs unbidden. A cooldown stamp prevents repeated nagging within a configurable time window.

## Key Claims

Never invokes an LLM or mutates the vault. Only recommends running the wiki command. Reads maintenance.enabled, lintEveryDays, and cooldownMinutes from project and user config files. Cooldown stamp is written to the settings directory as last-heartbeat. Exits 0 on any failure so it never interrupts SessionStart.

Covers: Autonomous Maintenance Recommendation, Cooldown Stamp, Backlog Detection
