# Automation — keeping the vault healthy on its own

The plugin can maintain the vault with little manual prompting. Three layers,
each opt-in and safe (git-checkpointed, budgeted, off by default):

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

It never ingests or mutates the vault; the heartbeat is read-only bash. It only recommends; the
actual work is the LLM step you trigger with `/claude-wiki-pages:wiki`. A
cooldown stamp prevents it from repeating the notice every session.

### Maintenance loop (the LLM step)

When maintenance is enabled and a backlog exists, `/claude-wiki-pages:wiki`
routes to `claude-wiki-pages-maintenance-agent`, which runs the whole loop in one
pass — ingest (up to `maxPerRun`) → curator heal → polish → lint — each step
git-checkpointed and reversible.

## Scheduling on a routine (optional)

Claude Code has no built-in cron. Scheduled upkeep uses a thin host-owned helper
(`scripts/maintenance-run.sh`) that you point at a cron schedule. The plugin never
creates system cron entries — scheduling is the host's responsibility.

### Step 1 — enable unattended mode

In `.claude/claude-wiki-pages.json` (project) or
`~/.config/claude-wiki-pages/config.json` (user), add:

```json
{
  "maintenance": {
    "enabled": true,
    "unattended": true,
    "maxPerRun": 10,
    "syncWiredOnRun": false
  }
}
```

- **`unattended`** — master scheduling gate. Off by default. When false,
  `maintenance-run.sh` prints a reminder and exits 0 (nothing runs).
- **`syncWiredOnRun`** — when true, pulls wired sources before ingest. Off by
  default (no network in the default scheduled run).

### Step 2 — add a cron entry

```sh
# Daily at 02:00 — vault lives at /path/to/project
0 2 * * *  cd /path/to/project && bash scripts/maintenance-run.sh
```

`maintenance-run.sh` resolves the active vault, enforces the unattended gate,
optionally syncs wired sources, writes an audit entry to `wiki/log.md`, and
then prints the Claude Code invocation to complete the loop. Run it headless
by chaining with the Claude CLI:

```sh
# Full headless recipe (place this in your cron, not the script above)
0 2 * * *  cd /path/to/project && \
  bash scripts/maintenance-run.sh && \
  claude -p "/claude-wiki-pages:wiki" --cwd /path/to/project \
    --env CLAUDE_WIKI_PAGES_MAINTENANCE_UNATTENDED=true
```

The helper exits 0 when there is nothing to do, so the Claude invocation only
runs when there is actual backlog to clear.

### Auditability

After every scheduled run, `wiki/log.md` contains one ordered entry tagged
`scheduled-upkeep / autonomous` with the source count and a named revert anchor:

```sh
git -C <vault> revert <post-snapshot-sha>   # restore the exact pre-run tree
```

Every change lands in one revertible snapshot range; uncertain content goes
to `_proposed/` (never auto-promoted to `wiki/`).

### SessionStart advisory

When `maintenance.enabled` is true and the backlog is non-empty but
`maintenance.unattended` is not yet set, the heartbeat prints:

```text
MAINTENANCE: 3 pending; enable scheduled upkeep: set maintenance.unattended=true
and run bash scripts/maintenance-run.sh on a cron schedule. See docs/automation.md.
```

### Session-only convenience (advanced)

Claude Code supports in-session `schedule`/`CronCreate` with `durable:false`
(default). These are **session-only**: they expire after 7 days, fire only while
the REPL is idle, and vanish on session exit. Use them for short-lived
experiments, not for durable nightly maintenance. The recommended durable path
is the host-cron recipe above.

## Safety

- Off by default; every layer is opt-in via `maintenance.enabled`.
- `maintenance.unattended=false` (default) — `maintenance-run.sh` prints a
  reminder and exits 0; nothing runs.
- The heartbeat never writes; the maintenance agent only writes through the
  existing git-checkpointed agents (ingest, curator, polish).
- Uncertain / new pages route to `_proposed/`, never auto-promoted.
- `maxPerRun` bounds each pass; `cooldownMinutes` bounds notice frequency.
- The firewall still confines every write to the vault.
- `maintenance-run.sh` refuses to target `tests/fixtures/reference-vault` (the
  reference fixture).
