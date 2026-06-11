---
title: "Backlog Detection"
type: concept
aliases: ["Backlog Detection", "backlog detection", "backlog", "Heartbeat", "heartbeat", "Maintenance Loop", "maintenance loop", "catch-up", "Catch-Up"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Automation]]", "[[Glossary]]", "[[Operations]]"]
related: ["[[Automation]]", "[[claude-wiki-pages-maintenance-agent]]", "[[One Advertised Path]]"]
contradicts: []
supersedes: []
depends_on: ["[[Automation]]"]
tags: [automation, backlog, heartbeat, maintenance]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Backlog Detection

Deterministic reporting of outstanding maintenance work via `bash scripts/engine.sh backlog --target <vault> --json`.

Output shape: `{ pendingRaw, lastIngest, lastLint, daysSinceLint, needsCatchup }`.

- A raw file is "pending" when no `wiki/_sources/<stem>.md` summary exists for it, or (schema v2) when the source manifest marks it `pending`.
- `needsCatchup` is `true` when there are pending sources or the last lint is older than `lintEveryDays` (from the maintenance config).

---

# Heartbeat

`scripts/heartbeat.sh` — runs at `SessionStart`. When `maintenance.enabled` is true and a backlog exists, prints one line:

```text
CATCHUP: 3 pending source(s), 9 day(s) since lint — run /claude-wiki-pages:wiki to process the backlog.
```

**Key constraints:**
- Never ingests or mutates the vault — bash cannot do LLM work.
- Only recommends; the actual work is the LLM step triggered by `/claude-wiki-pages:wiki`.
- A cooldown stamp (set by `cooldownMinutes`) prevents repeating the notice every session.

---

# Maintenance Loop

The full catch-up loop run by `claude-wiki-pages-maintenance-agent`:

1. Ingest (up to `maxPerRun` sources)
2. Curator heal (audit and auto-repair)
3. Polish (graph colors, vault MOC, per-folder MOC consistency)
4. Lint

Each step is git-checkpointed and reversible. Sources beyond `maxPerRun` are reported as remaining backlog — never silently skipped.

When `maintenance.enabled` is true and a backlog exists, `/claude-wiki-pages:wiki` routes to the maintenance agent automatically.

---

# Catch-Up

The act of acting on a backlog: the ingest → curator → polish → lint loop that clears pending sources and refreshes lint. Triggered by the maintenance loop or manually by `/claude-wiki-pages:wiki`.
