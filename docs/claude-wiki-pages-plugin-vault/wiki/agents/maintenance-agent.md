---
title: "Maintenance Agent"
type: entity
entity_type: tool
aliases: ["Maintenance Agent", "maintenance agent", "claude-wiki-pages-maintenance-agent"]
parent: "[[Agent Roles]]"
path: "agents"
sources: ["[[architecture]]", "[[automation]]"]
related: ["[[Orchestrator Agent]]", "[[Ingest Agent]]", "[[Curator Agent]]", "[[Automation Guide]]"]
tags: [agent, maintenance, automation]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Maintenance Agent

**`claude-wiki-pages-maintenance-agent`** — autonomous upkeep loop.

## Responsibilities

Runs the full catch-up cycle in one invocation:

1. Detect backlog: unprocessed `raw/` files + overdue lint (days since last lint > `maintenance.lintEveryDays`).
2. Run ingest for any pending sources.
3. Run curator (heal) for any structural issues.
4. Run polish for MOC and graph color sync.
5. Run lint as final verification.

Bounded by `maintenance.maxPerRun` (default: 10 sources per run).

## Configuration

```json
{
  "maintenance": {
    "enabled": false,
    "lintEveryDays": 7,
    "maxPerRun": 10,
    "cooldownMinutes": 30
  }
}
```

All options are opt-in (default: `false`/off). See [[Automation Guide]] for the full config reference.

## Git Protocol

Git-checkpointed throughout: a `snapshot` commit before the run and individual commits after each agent step. Any step can be reverted independently.

## Invocation

Dispatched by the orchestrator when `maintenance.enabled` is `true` and a backlog exists. Can also be invoked directly: "catch up" or "maintain the vault". Not a query agent — it writes, so it is gated like ingest.
