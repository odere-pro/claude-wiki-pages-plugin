---
title: "Vault Automation"
type: concept
aliases: ["vault automation", "Vault Automation", "scheduled upkeep", "maintenance loop"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-automation|Automation]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "automation", "maintenance"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Vault Automation

The three-layer opt-in system for keeping the vault healthy without manual prompting: backlog detection, heartbeat recommendation, and the maintenance loop.

## Definition

Vault automation is off by default. All three layers are opt-in and safe (git-checkpointed, budgeted). Nothing autonomous runs until `maintenance.enabled: true` is set in `.claude/claude-wiki-pages.json` or `~/.config/claude-wiki-pages/config.json`.

## Key Principles

**Three layers:**

1. **Backlog detection (deterministic).** `engine backlog --json` reports unprocessed raw sources and overdue lint. A raw file is "pending" when no `wiki/_sources/<stem>.md` summary exists. `needsCatchup` is true when there are pending sources or the last lint is older than `lintEveryDays`.

2. **Heartbeat (recommendation, never an action).** `scripts/heartbeat.sh` runs at `SessionStart`. When maintenance is enabled and a backlog exists, it prints one line: `CATCHUP: N pending source(s), N day(s) since lint — run /claude-wiki-pages:wiki`. Read-only; never mutates the vault. A cooldown stamp prevents repeating every session.

3. **Maintenance loop (the LLM step).** `claude-wiki-pages-maintenance-agent` runs the full ingest → curator → polish → lint pass in one git-checkpointed invocation, bounded by `maxPerRun`.

**Config fields:** `enabled` (master switch), `lintEveryDays` (how old counts as overdue), `maxPerRun` (sources per pass), `cooldownMinutes` (heartbeat quiet period), `unattended` (master scheduling gate for cron), `syncWiredOnRun` (pull wired sources before ingest).

**Scheduled upkeep.** Host-owned OS/cloud cron invoking `scripts/maintenance-run.sh`. The plugin never creates system cron entries — scheduling is the host's responsibility. The helper resolves the active vault, enforces the unattended gate, optionally syncs wired sources, writes an audit entry to `wiki/log.md`, then prints the Claude Code invocation. Full headless recipe:
```sh
0 2 * * * cd /path/to/project && bash scripts/maintenance-run.sh && \
  claude -p "/claude-wiki-pages:wiki" --cwd /path/to/project \
    --env CLAUDE_WIKI_PAGES_MAINTENANCE_UNATTENDED=true
```

**Safety.** Heartbeat never writes. Maintenance agent only writes through existing git-checkpointed agents. Uncertain/new pages route to `_proposed/`, never auto-promoted. `maxPerRun` bounds each pass; `cooldownMinutes` bounds notice frequency. Firewall still confines every write to the vault.

## Examples

After every scheduled run, `wiki/log.md` contains one ordered entry tagged `scheduled-upkeep / autonomous` with the source count and a named revert anchor. To roll back: `git -C <vault> revert <post-snapshot-sha>`.

## Related Concepts

The backlog detection uses the engine `backlog` verb (ADR-0026). The maintenance loop is implemented by the maintenance agent. The heartbeat script is documented in `docs/GLOSSARY.md` under the glossary term `heartbeat`.
