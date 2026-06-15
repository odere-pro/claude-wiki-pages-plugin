---
title: "Maintenance Loop"
type: concept
aliases: ["Maintenance Loop", "maintenance loop", "autonomous maintenance", "catch-up loop", "ingest-curator-polish-lint"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/automation|Automation]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]", "[[_sources/adr-0026-parallel-extract-and-scheduled-upkeep|ADR-0026: Bounded Parallel Extract and Scheduled Upkeep]]"]
related: ["[[Heartbeat]]", "[[Backlog]]", "[[scheduled-upkeep|Scheduled Upkeep]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "reference", "automation", "maintenance"]
created: 2026-06-13
updated: 2026-06-15
update_count: 3
status: active
confidence: 1.0
---

# Maintenance Loop

> [!summary]
> The maintenance loop is the autonomous four-phase catch-up sequence run by the `claude-wiki-pages-maintenance-agent`: ingest → curator → polish → lint. It is bounded by `maintenance.maxPerRun` (maximum sources per run). It is off by default and opt-in via `maintenance.enabled`. The manual equivalent is running the four agents sequentially.

## Key Principles

- The maintenance loop is the four-phase catch-up pipeline: ingest → curator → polish → lint, run in that fixed order.
- Each phase is bounded and git-checkpointed — no phase accumulates unbounded writes without a checkpoint.
- `maxPerRun` limits the ingest phase; sources beyond the limit remain in the backlog for the next run.
- The loop is off by default and requires `maintenance.enabled: true` to activate autonomously.
- The heartbeat detects when the loop is needed; the loop itself runs only when the orchestrator dispatches the maintenance agent.

## Examples

Manual equivalent of one maintenance loop run (all four phases):

```bash
/claude-wiki-pages:wiki       # ingest pending sources, then curator auto-heals, then polish
/claude-wiki-pages:status     # verify with structural lint
```

Autonomous configuration with a 10-source cap per run:

```json
{
  "maintenance": {
    "enabled": true,
    "maxPerRun": 10
  }
}
```

## Definition

The maintenance loop is the autonomous form of the standard wiki update pipeline. When the orchestrator detects a backlog (unprocessed raw sources or overdue lint) and `maintenance.enabled: true`, it dispatches the maintenance agent, which runs the four phases in sequence:

| Phase      | Agent / Tool                         | What it does                                                     |
| ---------- | ------------------------------------ | ---------------------------------------------------------------- |
| 1. Ingest  | `claude-wiki-pages-ingest-agent`     | Processes pending raw sources; creates/updates wiki pages        |
| 2. Curator | `claude-wiki-pages-curator-agent`    | Runs `engine.sh heal`; repairs structural errors; judgment fixes |
| 3. Polish  | `claude-wiki-pages-polish-agent`     | Updates graph colors, folder notes, vault MOC                    |
| 4. Lint    | `verify-ingest.sh` + structural lint | Reports remaining issues                                         |

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
    "enabled": false, // off by default; set true to enable autonomous loop
    "maxPerRun": 10 // max sources per maintenance run; default 10
  }
}
```

Off by default. Enable when the vault has frequent source additions and the user wants automatic catch-up without manual invocation.

## Relationship to Other Concepts

The maintenance loop is not the same as the ingest pipeline step-by-step execution. The maintenance loop runs all four phases as a single bounded operation. The orchestrator can also run the individual phases on demand (e.g., run only ingest without lint) when the user invokes specific commands.

## Scheduled (Unattended) Execution (ADR-0026)

[[scheduled-upkeep|Scheduled Upkeep]] extends the maintenance loop with a host-owned, hands-off execution path. `scripts/maintenance-run.sh` is the thin wrapper a host OS/cloud cron invokes. The plugin ships no durable cron of its own.

When `maintenance.unattended: true`, the loop enforces a strict subset of the interactive pipeline:
- Step 3 Optimize is always hard-skipped (non-trivial restructures require human interaction)
- Uncertain output (`derived:true` OR `confidence<0.8`) routes to `_proposed/`, never auto-promoted
- A non-trivial topic-tree plan aborts with an `ingest-aborted` log entry

## Related Concepts

- [[Heartbeat]] — the SessionStart probe that detects backlog and recommends running the maintenance loop
- [[Backlog]] — the unprocessed sources and overdue lint that the maintenance loop clears
- Maintenance Agent — the agent that orchestrates the four-phase maintenance loop
- Ingest Agent — Phase 1 of the maintenance loop
- Curator Agent — Phase 2 of the maintenance loop
- [[scheduled-upkeep|Scheduled Upkeep]] — the host-owned scheduling path for unattended runs
- Parallel Extract — optional performance enhancement for the ingest phase
