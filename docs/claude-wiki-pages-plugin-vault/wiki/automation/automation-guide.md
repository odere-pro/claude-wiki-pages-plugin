---
title: "Automation Guide"
type: concept
aliases: ["Automation Guide", "automation guide", "maintenance loop", "vault maintenance"]
parent: "[[Automation]]"
path: "automation"
sources: ["[[automation]]"]
related: ["[[Operations Guide]]", "[[Agents Layer]]"]
tags: [automation, maintenance]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Automation Guide

The plugin can maintain the vault with little manual prompting. Three layers, each opt-in and safe (git-checkpointed, budgeted, off by default):

1. **Backlog detection** — `engine backlog` reports unprocessed raw sources and overdue lint, deterministically.
2. **Heartbeat** — `scripts/heartbeat.sh` surfaces a one-line catch-up recommendation at `SessionStart`.
3. **Maintenance loop** — `claude-wiki-pages-maintenance-agent` runs the full ingest → curator → polish → lint pass in one invocation.

Nothing autonomous runs until you set `maintenance.enabled: true`.

## Enable It

In `.claude/claude-wiki-pages.json`:

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

| Field | Meaning |
| --- | --- |
| `enabled` | Master switch. Off by default. |
| `lintEveryDays` | A lint older than this counts as backlog. |
| `maxPerRun` | Cap on sources processed per maintenance pass. |
| `cooldownMinutes` | How long the heartbeat stays quiet after surfacing a recommendation. |

## How It Works

**Backlog (deterministic):**

```sh
bash scripts/engine.sh backlog --target <vault> --json
# → { pendingRaw, lastIngest, lastLint, daysSinceLint, needsCatchup }
```

A raw file is "pending" when no `wiki/_sources/<stem>.md` summary exists for it. `needsCatchup` is true when there are pending sources or the last lint is older than `lintEveryDays`.

**Heartbeat (recommendation, never an action):**

`scripts/heartbeat.sh` runs at `SessionStart`. When maintenance is enabled and a backlog exists, it prints one line:

```text
CATCHUP: 3 pending source(s), 9 day(s) since lint — run /claude-wiki-pages:wiki to process the backlog.
```

It **never** ingests or mutates the vault. A cooldown stamp prevents it from repeating the notice every session.

**Maintenance loop (the LLM step):**

When maintenance is enabled and a backlog exists, `/claude-wiki-pages:wiki` routes to the maintenance agent, which runs the whole loop in one pass — ingest (up to `maxPerRun`) → curator heal → polish → lint — each step git-checkpointed and reversible.

## Safety

- Off by default; every layer is opt-in via `maintenance.enabled`.
- The heartbeat never writes; the maintenance agent only writes through the existing git-checkpointed agents.
- `maxPerRun` bounds each pass; `cooldownMinutes` bounds notice frequency.
- The firewall still confines every write to the vault.

## Scheduling

Claude Code has no built-in cron, but you can register a scheduled agent or routine that runs `/claude-wiki-pages:wiki` on a cadence. With `maintenance.enabled: true`, that run processes any backlog automatically. A simple shell cadence:

```sh
claude -p "/claude-wiki-pages:wiki" --cwd /path/to/project
```
