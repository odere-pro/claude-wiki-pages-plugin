---
title: "Heartbeat"
type: concept
aliases: ["Heartbeat", "heartbeat", "heartbeat.sh", "SessionStart heartbeat", "backlog probe"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[Automation]]", "[[Engine API Skill (SKILL.md)]]"]
related: ["[[Maintenance Loop]]", "[[Backlog]]", "[[Maintenance Agent]]", "[[Hook System]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "reference", "automation", "maintenance"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Heartbeat

> [!summary]
> The heartbeat is a SessionStart hook that runs `scripts/heartbeat.sh` when `maintenance.enabled` is true and a backlog exists. It surfaces a one-line catch-up recommendation to the user. It never mutates the vault — it recommends only. The heartbeat makes backlog visible without requiring the user to actively check.

## Definition

The heartbeat (`scripts/heartbeat.sh`) is the plugin's passive monitoring mechanism. It fires at the start of every Claude Code session when the maintenance config has `enabled: true`. It checks for:

1. **Source backlog** — raw sources in `raw/` without corresponding `_sources/` summaries (detected via `engine backlog` in O(1) using the source manifest).
2. **Overdue lint** — wiki pages flagged as `stale` by the last lint run.

If either condition is true, the heartbeat emits a single line:

```
claude-wiki-pages: N source(s) pending + M stale pages — run /claude-wiki-pages:wiki to catch up.
```

If no backlog exists, it exits silently.

## Recommend Only, Never Mutate

The heartbeat is a read-only probe. It never triggers ingest, heal, or any write operation — not even in `maintenance.enabled: true` mode. Its role is to surface the backlog for the human; acting on it is the orchestrator's job (when the user next invokes `/claude-wiki-pages:wiki`).

This design separates two concerns:
- **Awareness** (heartbeat's job): know that a backlog exists.
- **Action** (orchestrator's job): decide when and whether to address it.

## Relationship to Maintenance Loop

The [[Maintenance Loop]] is the autonomous agent that runs ingest → curator → polish → lint. The heartbeat is not part of the maintenance loop — it is a pre-loop probe. The loop runs when the user invokes the wiki command or when the maintenance agent is dispatched. The heartbeat just tells the user the loop is needed.

```
Session start
  └── heartbeat.sh (read-only probe)
       └── if backlog: print one-line recommendation
       └── if no backlog: silent

User invokes /claude-wiki-pages:wiki
  └── Orchestrator detects backlog
       └── Dispatches maintenance agent
            └── Maintenance loop: ingest → curator → polish → lint
```

## Configuration

```json
// .claude/claude-wiki-pages/settings.json
{
  "maintenance": {
    "enabled": false,     // off by default — opt-in
    "maxPerRun": 10       // max sources per maintenance run
  }
}
```

`enabled: false` (the default) means the heartbeat runs silently even when a backlog exists. Users who want proactive awareness set `enabled: true`.

## Related Concepts

- [[Maintenance Loop]] — the autonomous agent the heartbeat recommends running
- [[Backlog]] — the source and lint overdue state that the heartbeat detects
- [[Maintenance Agent]] — the agent that runs the maintenance loop
- [[Hook System]] — the event system that fires the heartbeat at SessionStart
