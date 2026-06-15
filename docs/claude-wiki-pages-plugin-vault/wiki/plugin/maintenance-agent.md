---
title: "Maintenance Agent"
type: entity
entity_type: tool
aliases: ["Maintenance Agent", "maintenance agent", "claude-wiki-pages-maintenance-agent"]
parent: "[[plugin|claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[_sources/architecture|Architecture Documentation]]", "[[_sources/automation|Automation]]", "[[_sources/teams|Agent Teams]]", "[[_sources/operations|Operations Guide]]", "[[plugin-maintenance-agent|Maintenance Agent Source]]"]
related: ["[[orchestrator-agent|Orchestrator Agent]]", "[[Backlog]]", "[[ingest-agent|Ingest Agent]]", "[[curator-agent|Curator Agent]]", "[[polish-agent|Polish Agent]]"]
tags: ["agent", "automation"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Maintenance Agent

> [!summary]
> The `claude-wiki-pages-maintenance-agent` runs the full catch-up loop — ingest → curator → polish → lint — in one autonomous invocation. It is off by default and gated behind `maintenance.enabled: true` in config. Each step in the loop is git-checkpointed and bounded by `maintenance.maxPerRun`. The [[Backlog]] detection is O(1) via the source manifest. The SessionStart heartbeat recommends a catch-up run but never triggers one automatically.

## Key Facts

- Type: tool (Layer 3 agent, off by default — requires `maintenance.enabled: true` in config)
- Agent name: `claude-wiki-pages-maintenance-agent`
- Dispatched by: [[orchestrator-agent|Orchestrator Agent]] when `maintenance.enabled: true` and `engine backlog` reports pending sources or overdue lint
- Catch-up loop: 4 steps in sequence — Ingest (Step 1), Curator (Step 2), Polish (Step 3), Lint (Step 4)
- Bounded by `maintenance.maxPerRun`: caps the number of raw sources processed per pass; remaining backlog is reported, not silently skipped
- Every step creates its own git checkpoint commit for full reversibility
- The heartbeat (`scripts/heartbeat.sh`) recommends a catch-up run at `SessionStart` but never triggers one automatically

## Overview

The `claude-wiki-pages-maintenance-agent` is the Layer 3 agent for autonomous vault maintenance. Its role is to keep the wiki healthy when the user is not actively working with it — processing accumulated raw sources and running periodic lint — without requiring manual orchestration.

The agent is **off by default** and must be explicitly enabled. This design reflects the plugin's principle: nothing autonomous runs until you opt in. Even when enabled, the agent is bounded by a per-run cap (`maintenance.maxPerRun`) so it cannot exhaust session budget on a large backlog.

## Dispatch Condition

The [[orchestrator-agent|Orchestrator Agent]] dispatches the maintenance agent when:

1. `maintenance.enabled: true` is set in config.
2. `engine backlog` reports pending sources or overdue lint.

If `maintenance.enabled` is false (the default), the orchestrator does not dispatch this agent even if a large backlog exists — it surfaces the backlog in the session output instead.

## Configuration

In `.claude/claude-wiki-pages.json` (project-scoped) or `~/.config/claude-wiki-pages/config.json` (user-scoped):

```json
{
  "maintenance": {
    "enabled": true,
    "autoCatchupOnSessionStart": true,
    "lintEveryDays": 7,
    "maxPerRun": 10,
    "cooldownMinutes": 60
  }
}
```

| Field                       | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `enabled`                   | Master switch; off by default                              |
| `autoCatchupOnSessionStart` | Whether to dispatch on session open when backlog exists    |
| `lintEveryDays`             | Days since last lint before overdue lint counts as backlog |
| `maxPerRun`                 | Maximum raw sources processed per maintenance pass         |
| `cooldownMinutes`           | Minimum time between heartbeat recommendations             |

## The Catch-Up Loop

When dispatched, the maintenance agent runs four steps in sequence:

### Step 1 — Ingest

Calls the [[ingest-agent|Ingest Agent]] for up to `maxPerRun` pending raw sources. Each source processed follows the full 13-step ingest rules. The ingest step is git-checkpointed (snapshot pre/post). If `maxPerRun` is reached before all pending sources are processed, the remaining count is reported as remaining backlog.

### Step 2 — Curator

After ingest, calls the [[curator-agent|Curator Agent]] to run the audit-and-repair pass. The curator runs `engine heal` first (deterministic structural fixes), then auto-heals mechanical issues, then applies judgment fixes under the git checkpoint.

### Step 3 — Polish

After curator, calls the [[polish-agent|Polish Agent]] to sync the Obsidian-side state: graph colors for any new topic folders, `wiki/index.md` regeneration, folder note reconciliation.

### Step 4 — Lint

Runs a final lint pass (`engine verify --json`) and reports findings. Any unresolved items at the ERROR level are surfaced as the maintenance loop's output for human review.

Each step creates its own git checkpoint commit, so the catch-up loop produces a traceable commit sequence in the vault's git history.

## Heartbeat

At `SessionStart`, `scripts/heartbeat.sh` runs independently of the maintenance agent. It checks `engine backlog` output and, when maintenance is enabled and a backlog exists, prints one advisory line:

```
CATCHUP: 3 pending source(s), 9 day(s) since lint — run /claude-wiki-pages:wiki to process the backlog.
```

The heartbeat **never** ingests or mutates the vault — bash cannot call the LLM. It surfaces the recommendation; the actual work is triggered by the user running `/claude-wiki-pages:wiki`. A `cooldownMinutes` stamp prevents the heartbeat from repeating the same recommendation every session.

## Backlog Detection

`engine backlog --target <vault> --json` returns:

```json
{
  "pendingRaw": 5,
  "lastIngest": "2026-06-10",
  "lastLint": "2026-05-30",
  "daysSinceLint": 14,
  "needsCatchup": true
}
```

A raw file is "pending" when no `wiki/_sources/<stem>.md` summary exists for it, or when the source manifest marks it `pending`. The manifest check is O(1) — no log re-scan required.

`needsCatchup` is `true` when `pendingRaw > 0` or `daysSinceLint > lintEveryDays`.

## Safety Properties

- **Off by default.** Existing installs see no behavioral change.
- **Bounded.** `maxPerRun` caps sources per pass. Remaining backlog is reported, not silently skipped.
- **Git-checkpointed.** Every step is reversible. A failed maintenance run can be rolled back step by step.
- **Firewall-confined.** The maintenance loop uses the same agents as manual runs; all write confinement still applies.
- **Never reaches outside the vault.** The heartbeat cannot schedule system cron entries. Scheduling (if desired) is the user's responsibility.

## Related

- [[orchestrator-agent|Orchestrator Agent]] — dispatches this agent when maintenance is enabled and backlog exists
- [[Backlog]] — the pending-sources and overdue-lint state this agent clears
- [[ingest-agent|Ingest Agent]] — Step 1 of the catch-up loop
- [[curator-agent|Curator Agent]] — Step 2 of the catch-up loop
- [[polish-agent|Polish Agent]] — Step 3 of the catch-up loop
