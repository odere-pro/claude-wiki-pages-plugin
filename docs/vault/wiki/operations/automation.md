---
title: "Automation"
type: concept
aliases: ["Automation", "automation", "vault automation", "autonomous maintenance"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Automation]]", "[[Operations]]", "[[Glossary]]"]
related: ["[[Backlog Detection]]", "[[Heartbeat]]", "[[Maintenance Loop]]", "[[claude-wiki-pages-maintenance-agent]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [automation, maintenance]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Automation

The three-layer opt-in vault automation system in `claude-wiki-pages`. All layers are off by default and safe (git-checkpointed, budgeted).

## Configuration

In `.claude/claude-wiki-pages.json` (project) or `~/.config/claude-wiki-pages/config.json` (user):

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

`enabled` is the master switch (off by default). Nothing autonomous runs until it is set to `true`.

## Three Layers

### 1. Backlog Detection (Deterministic)

[[Backlog Detection]] via `engine backlog --json`. Reports `{ pendingRaw, lastIngest, lastLint, daysSinceLint, needsCatchup }`. A raw file is "pending" when no `wiki/_sources/<stem>.md` summary exists (or when the source manifest marks it `pending`). `needsCatchup` is true when there are pending sources or the last lint is older than `lintEveryDays`.

### 2. Heartbeat (Recommendation Only)

[[Heartbeat]] via `scripts/heartbeat.sh`. Runs at `SessionStart`. When maintenance is enabled and a backlog exists, prints one line:

```text
CATCHUP: 3 pending source(s), 9 day(s) since lint — run /claude-wiki-pages:wiki to process the backlog.
```

Never ingests or mutates the vault. A cooldown stamp prevents repeating the notice every session.

### 3. Maintenance Loop (The LLM Step)

[[Maintenance Loop]] via `claude-wiki-pages-maintenance-agent`. When maintenance is enabled and a backlog exists, `/claude-wiki-pages:wiki` routes to the maintenance agent, which runs ingest (up to `maxPerRun`) → curator heal → polish → lint in one pass. Each step is git-checkpointed and reversible.

## Safety

- Off by default; every layer is opt-in.
- The heartbeat never writes; the maintenance agent only writes through existing git-checkpointed agents.
- `maxPerRun` bounds each pass; `cooldownMinutes` bounds notice frequency.
- The firewall still confines every write to the vault.

## Scheduling

Claude Code has no built-in cron. Register a scheduled agent or use a shell cron:

```sh
# daily — your scheduler invokes Claude Code headless
claude -p "/claude-wiki-pages:wiki" --cwd /path/to/project
```
