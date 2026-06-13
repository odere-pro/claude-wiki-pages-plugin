---
title: "Maintenance Loop"
type: concept
aliases: ["Maintenance Loop", "maintenance loop", "autonomous maintenance", "catch-up loop", "ingest-curator-polish-lint"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Automation]]", "[[Engine API Skill (SKILL.md)]]"]
related: ["[[Heartbeat]]", "[[Backlog]]", "[[Maintenance Agent]]", "[[Ingest Agent]]", "[[Curator Agent]]"]
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

# Maintenance Loop

> [!summary]
> The maintenance loop is the autonomous four-phase catch-up sequence run by the `claude-wiki-pages-maintenance-agent`: ingest → curator → polish → lint. It is bounded by `maintenance.maxPerRun` (maximum sources per run). It is off by default and opt-in via `maintenance.enabled`. The manual equivalent is running the four agents sequentially.

## Definition

The maintenance loop is the autonomous form of the standard wiki update pipeline. When the orchestrator detects a backlog (unprocessed raw sources or overdue lint) and `maintenance.enabled: true`, it dispatches the maintenance agent, which runs the four phases in sequence:

| Phase | Agent / Tool | What it does |
| --- | --- | --- |
| 1. Ingest | `claude-wiki-pages-ingest-agent` | Processes pending raw sources; creates/updates wiki pages |
| 2. Curator | `claude-wiki-pages-curator-agent` | Runs `engine.sh heal`; repairs structural errors; judgment fixes |
| 3. Polish | `claude-wiki-pages-polish-agent` | Updates graph colors, folder notes, vault MOC |
| 4. Lint | `verify-ingest.sh` + structural lint | Reports remaining issues |

Each phase is bounded and checkpointed. The ingest phase processes at most `maintenance.maxPerRun` sources. If more sources are pending, they remain in the backlog for the next maintenance run.

## Bounded by `maxPerRun`

`maintenance.maxPerRun` (default: 10) limits how many sources the maintenance agent processes in a single ingest phase. This prevents a large backlog from causing a single maintenance run to take too long. The [[Heartbeat]] will continue to surface the backlog on subsequent sessions until all sources are processed.

## Manual Equivalent

A user who prefers manual control can run the catch-up pipeline manually:

```bash
/claude-wiki-pages:wiki       # ingest pending sources
# then curator auto-heals
# then polish updates graph/MOC
/claude-wiki-pages:status     # verify with lint
```

This is identical to the maintenance loop but requires explicit invocation at each step. The maintenance loop is the automation of this sequence.

## Configuration

```json
// .claude/claude-wiki-pages/settings.json
{
  "maintenance": {
    "enabled": false,     // off by default; set true to enable autonomous loop
    "maxPerRun": 10       // max sources per maintenance run; default 10
  }
}
```

Off by default. Enable when the vault has frequent source additions and the user wants automatic catch-up without manual invocation.

## Relationship to Other Concepts

The maintenance loop is not the same as the ingest pipeline step-by-step execution. The maintenance loop runs all four phases as a single bounded operation. The orchestrator can also run the individual phases on demand (e.g., run only ingest without lint) when the user invokes specific commands.

## Related Concepts

- [[Heartbeat]] — the SessionStart probe that detects backlog and recommends running the maintenance loop
- [[Backlog]] — the unprocessed sources and overdue lint that the maintenance loop clears
- [[Maintenance Agent]] — the agent that orchestrates the four-phase maintenance loop
- [[Ingest Agent]] — Phase 1 of the maintenance loop
- [[Curator Agent]] — Phase 2 of the maintenance loop
