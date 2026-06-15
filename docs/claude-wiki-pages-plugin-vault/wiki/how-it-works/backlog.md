---
title: "Backlog"
type: concept
aliases: ["Backlog", "backlog", "pending sources", "catch-up", "engine backlog"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Automation]]", "[[Glossary]]", "[[User Guide 06: Check the Dashboard]]", "[[Operations Guide]]"]
related: ["[[Maintenance Agent]]", "[[Deterministic Engine]]", "[[Ingest Agent]]", "[[Curator Agent]]"]
tags: ["concept", "automation", "maintenance"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Backlog

> [!summary]
> The backlog is the set of outstanding maintenance work: raw sources in `vault/raw/` with no `_sources/` summary (pending ingest) plus overdue lint (last lint older than `lintEveryDays` config). Detected in O(1) by `engine backlog` using the source manifest. The SessionStart heartbeat surfaces a one-line recommendation when the backlog is non-empty. The [[Maintenance Agent]] clears the backlog when `maintenance.enabled: true` is set.

## Key Principles

- The backlog has two components: pending raw sources (no `_sources/` summary yet) and overdue lint (last lint older than `lintEveryDays`).
- Detection is O(1) via the source manifest — `engine backlog` never re-scans `wiki/log.md` on each session open.
- The heartbeat is advisory only: it prints one line but never mutates the vault. Acting on the backlog is always the user's or orchestrator's job.
- `maxPerRun` bounds each maintenance run; sources exceeding the limit remain in the backlog for the next session.
- Maintenance automation is off by default (`enabled: false`) — users opt in explicitly.

## Examples

Sample `engine backlog --json` output with pending sources and overdue lint:

```json
{
  "pendingRaw": 5,
  "lastIngest": "2026-06-10",
  "lastLint": "2026-05-30",
  "daysSinceLint": 14,
  "needsCatchup": true
}
```

Heartbeat message surfaced at session start when `enabled: true` and backlog is non-empty:

```
CATCHUP: 3 pending source(s), 9 day(s) since lint — run /claude-wiki-pages:wiki to process the backlog.
```

## Definition

The backlog has two components:

1. **Pending raw sources** — files in `vault/raw/` that have no corresponding `wiki/_sources/<stem>.md` summary. These are sources waiting to be ingested.
2. **Overdue lint** — the last lint run (marked in `wiki/log.md`) is older than `maintenance.lintEveryDays` (default: 7 days). The wiki's structural health degrades silently without periodic lint.

The `needsCatchup` flag is `true` when either component is non-zero:

```json
{
  "pendingRaw": 5,
  "lastIngest": "2026-06-10",
  "lastLint": "2026-05-30",
  "daysSinceLint": 14,
  "needsCatchup": true
}
```

## O(1) Detection

`engine backlog --target <vault> --json` detects the backlog without re-scanning `wiki/log.md`. Instead, it reads the source manifest (`wiki/_sources/manifest.md`):

- A raw file is "pending" when the manifest marks it `pending` or when no summary exists.
- Last lint date is stored in the manifest (updated by every lint run) or derived from `wiki/log.md` in O(1) by reading the last entry.

The O(1) property is important for the SessionStart heartbeat: `scripts/heartbeat.sh` runs on every session open, and scanning the full log on every session would be expensive for large vaults.

## Heartbeat

`scripts/heartbeat.sh` runs at `SessionStart`. When maintenance is enabled (`maintenance.enabled: true`) and the backlog is non-empty, it prints one advisory line:

```
CATCHUP: 3 pending source(s), 9 day(s) since lint — run /claude-wiki-pages:wiki to process the backlog.
```

Properties of the heartbeat:

- **Advisory only** — the heartbeat never ingests or mutates the vault. Bash cannot call the LLM.
- **Recommends** — prints one line. The actual catch-up is triggered by the user running `/claude-wiki-pages:wiki`.
- **Cooldown** — a `cooldownMinutes` stamp prevents the same recommendation from appearing on every session. After the heartbeat fires, it stays quiet for `maintenance.cooldownMinutes` (default: 60) minutes.

If `maintenance.enabled: false` (the default), the heartbeat is silent even when the backlog is non-empty.

## Clearing the Backlog

### Manual (recommended for understanding the results)

```
/claude-wiki-pages:wiki
```

The [[Orchestrator Agent]] finds the pending sources and runs the [[Ingest Agent]], then the [[Curator Agent]], then the [[Polish Agent]]. After ingest, the orchestrator's next probe sees the updated log and routes appropriately.

### Autonomous (when `maintenance.enabled: true`)

With the maintenance flag set, `/claude-wiki-pages:wiki` routes to the [[Maintenance Agent]] when a backlog exists. The maintenance agent runs the full catch-up loop:

1. [[Ingest Agent]] — up to `maxPerRun` pending sources.
2. [[Curator Agent]] — audit-and-repair.
3. [[Polish Agent]] — graph/index sync.
4. Lint — final verify.

Each step is git-checkpointed. If `maxPerRun` is reached before all pending sources are processed, the remaining count is reported as remaining backlog.

## Backlog as a Health Signal

The backlog size is a leading indicator of wiki health:

- **0 pending, lint recent** — healthy. The wiki reflects current source material.
- **1–10 pending** — normal accumulation between sessions.
- **>10 pending** — meaningful backlog; consider enabling the maintenance agent or scheduling a catch-up session.
- **Overdue lint** — structural drift may be accumulating; run the curator.

The dashboard page (user guide 6) surfaces these metrics via Dataview queries: `pendingRaw`, `daysSinceLint`, and the list of pending source filenames.

## Configuration

In `.claude/claude-wiki-pages.json` or `~/.config/claude-wiki-pages/config.json`:

```json
{
  "maintenance": {
    "enabled": false,
    "lintEveryDays": 7,
    "maxPerRun": 10,
    "cooldownMinutes": 60
  }
}
```

| Field             | Default | Effect                                        |
| ----------------- | ------- | --------------------------------------------- |
| `enabled`         | `false` | Master switch for autonomous maintenance      |
| `lintEveryDays`   | `7`     | Days before lint counts as overdue            |
| `maxPerRun`       | `10`    | Cap on sources processed per maintenance pass |
| `cooldownMinutes` | `60`    | Heartbeat quiet time after recommendation     |

## Related Concepts

- [[Maintenance Agent]] — the autonomous agent that clears the backlog
- [[Deterministic Engine]] — `engine backlog` command detects it in O(1)
- [[Ingest Agent]] — processes the pending sources component of the backlog
- [[Curator Agent]] — addresses the overdue-lint component
