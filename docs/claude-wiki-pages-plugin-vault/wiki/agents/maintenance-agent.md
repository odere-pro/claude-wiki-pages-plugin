---
title: "Maintenance Agent"
type: entity
entity_type: tool
aliases: ["Maintenance Agent", "claude-wiki-pages-maintenance-agent", "maintenance agent"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-maintenance-agent|claude-wiki-pages-maintenance-agent]]"]
related: []
tags: ["agents", "autonomous", "maintenance", "backlog"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Maintenance Agent

The autonomous catch-up specialist: when `maintenance.enabled` is on and a backlog exists, it runs the full ingest → curator → polish → lint loop in one invocation.

## Overview

The maintenance agent (`claude-wiki-pages-maintenance-agent`) runs the whole catch-up loop — ingest, curator (heal), polish, and final lint — in a single pass. It exists to make the plugin self-sufficient without the user re-running `/claude-wiki-pages:wiki` for each phase. It is off by default and never fires unbidden.

The agent sequences three specialist agents:

1. **Ingest** — if `pendingRaw` is non-empty, dispatch the ingest agent for up to `maintenance.maxPerRun` sources.
2. **Curator** — dispatch the curator agent in `audit-and-fix` mode to heal structural drift.
3. **Polish** — dispatch the polish agent to apply graph colors, refresh the vault MOC, and reconcile folder-note consistency.
4. **Lint** — run `engine.sh verify` and surface residual warnings.

The agent makes no snapshot calls of its own — each specialist already git-bounds its own writes.

## Key Facts

- **Model:** sonnet
- **Tools:** Bash, Read, Glob, Grep, Task
- **Trigger:** dispatched by the orchestrator when `maintenance.enabled == true && needs_catchup == true`
- **Budget:** `maintenance.maxPerRun` sources per invocation (default 10); surplus reported as remaining backlog
- **Off by default:** `maintenance.enabled` is false; requires explicit opt-in in config
- **Relationship to heartbeat:** `scripts/heartbeat.sh` (SessionStart) recommends catch-up; this agent performs it when the user or an autonomous `/wiki` run acts on that recommendation

## Related

Invoked by the orchestrator on the autonomous path. Internally delegates to the ingest agent, curator agent, and polish agent in sequence.
