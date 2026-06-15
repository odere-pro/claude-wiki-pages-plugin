---
title: "Scheduled Upkeep"
type: concept
aliases: ["Scheduled Upkeep", "scheduled upkeep", "autonomous upkeep", "host-owned maintenance", "maintenance-run.sh", "unattended maintenance"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/adr-0026-parallel-extract-and-scheduled-upkeep|ADR-0026: Bounded Parallel Extract and Scheduled Upkeep]]"]
related: ["[[maintenance-loop|Maintenance Loop]]", "[[maintenance-agent|Maintenance Agent]]", "[[Heartbeat]]", "[[Backlog]]", "[[draft-review-surface|Draft Review Surface]]", "[[git-checkpoint|Git Checkpoint]]", "[[wired-source|Wired Source]]"]
contradicts: []
supersedes: []
depends_on: ["[[maintenance-loop|Maintenance Loop]]", "[[git-checkpoint|Git Checkpoint]]"]
tags: ["concept", "automation", "scheduled", "maintenance", "upkeep"]
created: 2026-06-15
updated: 2026-06-15
update_count: 1
status: active
confidence: 1.0
---

# Scheduled Upkeep

## Definition

Scheduled upkeep is the capability for the wiki maintenance loop to run hands-off via a host-owned OS or cloud cron. The plugin provides `scripts/maintenance-run.sh` as a thin helper that resolves one vault and runs the maintenance loop; durable scheduling is the host's responsibility. The plugin ships no durable routine of its own.

## Design Rationale

The plugin cannot own a durable cron: `CronCreate` is session-only (7-day-expiry, REPL-idle-only) and its state lives in `.claude/scheduled_tasks.json` **outside the vault firewall**. `maintenance-run.sh` is the correct boundary: it is a thin wrapper the host invokes, not a self-scheduling mechanism.

## The Unattended Contract

`maintenance.unattended` (boolean, default `false`) enables hands-off execution with a strict subset of the interactive pipeline:

| Rule | Detail |
|---|---|
| **HARD-SKIP Step 3 Optimize** | Restructures are never done unattended — "restructure needed, run interactively" is reported. |
| **Uncertain output → `_proposed/`** | `derived:true` OR `confidence<0.8` routes to `_proposed/`, never auto-promoted. |
| **Deterministic mechanical heal applies** | Revertible structural fixes still run directly to `wiki/`. |
| **Non-trivial topic-tree plan aborts** | Creating a new top-level folder or moving/renaming pages → clean abort with `ingest-aborted` log entry. |
| **Bounded by `maxPerRun`** | Default 10 sources per scheduled run. |

There is no `autoApprovePlan` and no `autoPromoteDrafts` setting — both are negative capability guarantees, not tunable options.

## Auditability After a Run

After any unattended run, a human can answer "what changed and can I undo it?" from durable artifacts alone:
- One ordered `wiki/log.md` entry tagged `scheduled/autonomous` with source count + pre-run snapshot SHA
- Every change inside one `snapshot pre..post` revertible range
- Uncertain output in `_proposed/` (never promoted without human review)

**Falsifier:** if a scheduled run can promote a draft to `wiki/` without review, the feature is blocked.

## Optional Wired-Source Sync

`maintenance.syncWiredOnRun` (boolean, default `false`): with it on, `sync-source.sh` pulls only already-registered remotes into `raw/wired/` — never overwriting `raw/`. Default scheduled runs touch no network.

## Configuration Summary

| Field | Default | Semantics |
|---|---|---|
| `maintenance.unattended` | `false` | Enable hands-off execution |
| `maintenance.maxPerRun` | 10 | Max sources per scheduled run |
| `maintenance.maxParallelExtract` | 1 | Worker count for extract phase |
| `maintenance.syncWiredOnRun` | `false` | Pull registered remotes before ingest |

## Related Concepts

- [[maintenance-loop|Maintenance Loop]] — the ingest→curator→polish→lint loop this scheduling invokes
- [[maintenance-agent|Maintenance Agent]] — the specialist that runs the bounded catch-up loop
- [[draft-review-surface|Draft Review Surface]] — where uncertain unattended output is staged
- [[git-checkpoint|Git Checkpoint]] — every unattended run is fully checkpointed and revertible
- [[Heartbeat]] — the in-session probe that recommends maintenance (but never invokes it headlessly)
