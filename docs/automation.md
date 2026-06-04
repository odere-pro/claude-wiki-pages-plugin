# Automation — keeping the vault healthy on its own

The plugin can maintain the vault with little manual prompting. Three layers,
each **opt-in** and safe (git-checkpointed, budgeted, off by default):

1. **Backlog detection** — `engine backlog` reports unprocessed raw sources and
   overdue lint, deterministically.
2. **Heartbeat** — `scripts/heartbeat.sh` surfaces a one-line catch-up
   recommendation at SessionStart.
3. **Maintenance loop** — `claude-wiki-pages-maintenance-agent` runs the full
   ingest → curator → polish → lint pass in one invocation.

Nothing autonomous runs until you set `maintenance.enabled: true`.

## Enable it

In `.claude/claude-wiki-pages.json` (project) or
`~/.config/claude-wiki-pages/config.json` (user):

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

- **`enabled`** — master switch. Off by default.
- **`lintEveryDays`** — a lint older than this counts as backlog.
- **`maxPerRun`** — cap on sources processed per maintenance pass; the rest is
  reported as remaining backlog.
- **`cooldownMinutes`** — how long the heartbeat stays quiet after surfacing a
  recommendation, so it doesn't nag every session.

## How it works

### Backlog (deterministic)

```sh
bash scripts/engine.sh backlog --target <vault> --json
# → { pendingRaw, lastIngest, lastLint, daysSinceLint, needsCatchup }
```

A raw file is "pending" when no `wiki/_sources/<stem>.md` summary exists for it
(or, with schema v2, when the source manifest marks it `pending`). `needsCatchup`
is true when there are pending sources or the last lint is older than
`lintEveryDays`.

### Heartbeat (recommendation, never an action)

`scripts/heartbeat.sh` runs at SessionStart. When maintenance is enabled and a
backlog exists, it prints one line:

```text
CATCHUP: 3 pending source(s), 9 day(s) since lint — run /claude-wiki-pages:wiki to process the backlog.
```

It **never** ingests or mutates the vault — bash can't. It only recommends; the
actual work is the LLM step you trigger with `/claude-wiki-pages:wiki`. A
cooldown stamp prevents it from repeating the notice every session.

### Maintenance loop (the LLM step)

When maintenance is enabled and a backlog exists, `/claude-wiki-pages:wiki`
routes to `claude-wiki-pages-maintenance-agent`, which runs the whole loop in one
pass — ingest (up to `maxPerRun`) → curator heal → polish → lint — each step
git-checkpointed and reversible.

## Scheduling on a routine (optional)

Claude Code has no built-in cron, but you can register a scheduled agent /
routine that runs `/claude-wiki-pages:wiki` on a cadence (e.g. daily). With
`maintenance.enabled: true`, that run processes any backlog automatically. The
plugin deliberately does **not** create system cron entries for you — scheduling
is the host's responsibility and a non-goal for a plugin (it would write outside
the vault, which the firewall blocks anyway).

A simple shell-driven cadence, if you prefer to own it:

```sh
# every morning — your scheduler invokes Claude Code headless against the project
claude -p "/claude-wiki-pages:wiki" --cwd /path/to/project
```

## Safety

- Off by default; every layer is opt-in via `maintenance.enabled`.
- The heartbeat never writes; the maintenance agent only writes through the
  existing git-checkpointed agents (ingest, curator, polish).
- `maxPerRun` bounds each pass; `cooldownMinutes` bounds notice frequency.
- The firewall still confines every write to the vault.
