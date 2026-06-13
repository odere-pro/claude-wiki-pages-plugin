---
title: "Maintenance Agent"
type: entity
entity_type: tool
aliases: ["Maintenance Agent", "maintenance agent", "claude-wiki-pages-maintenance-agent"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Automation]]", "[[Operations Guide]]"]
related: ["[[Orchestrator Agent]]", "[[Backlog]]", "[[Heartbeat]]", "[[Maintenance Loop]]"]
tags: ["agent", "automation"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Maintenance Agent

## Overview

The `claude-wiki-pages-maintenance-agent` runs the full catch-up loop autonomously — ingest → curator → polish → lint — in one invocation. It is off by default; enabled via `maintenance.enabled` in config. The maintenance agent is bounded by `maintenance.maxPerRun` and git-checkpointed throughout.

## Key Facts

- **Slug:** `claude-wiki-pages-maintenance-agent`
- **Dispatch condition:** `maintenance.enabled` is `true` AND a backlog exists (detected by `engine backlog`).
- **Off by default:** requires explicit `maintenance.enabled: true` in config.
- **Catch-up loop:** ingest → curator → polish → lint. Bounded by `maintenance.maxPerRun`.
- **Heartbeat:** At `SessionStart`, `scripts/heartbeat.sh` surfaces a one-line recommendation when maintenance is enabled and a backlog exists. Recommends only, never mutates.
- **Backlog detection:** `engine backlog` reports pending sources (no `_sources/` summary) + overdue lint.

## Related

- [[Orchestrator Agent]] — dispatches to this agent when maintenance is enabled + backlog exists
- [[Backlog]] — what the maintenance agent clears
- [[Heartbeat]] — the SessionStart notification about the backlog
- [[Maintenance Loop]] — the conceptual catch-up pattern
