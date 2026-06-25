---
title: "Orchestrator Agent"
type: entity
entity_type: tool
aliases: ["Orchestrator Agent", "claude-wiki-pages-orchestrator-agent", "orchestrator"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-orchestrator-agent|claude-wiki-pages-orchestrator-agent]]"]
related: []
tags: ["agents", "orchestration", "routing", "specialist-fan-out"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Orchestrator Agent

The top-level routing agent for claude-wiki-pages: it probes vault state, chooses exactly one specialist per invocation, fans out via Task, and composes the final report.

## Overview

The orchestrator agent (`claude-wiki-pages-orchestrator-agent`) is the single entry point dispatched by the `/claude-wiki-pages:wiki` slash command. It is a read-only agent — it never writes vault content. Its sole job is to probe, route, and report.

The agent probes seven facts at startup: `vault_exists`, `schema_version`, `raw_pending`, `last_log_entry`, `autonomous`, `pending_drafts`, and `graph_health`. A degraded-mode reachability probe (`degraded.decision`) runs only when `localModel.enabled && offlinePolicy != "off"`.

After probing, the orchestrator walks a top-to-bottom decision table and dispatches the first matching row as a single `Task` call. It never fans out to two specialists for the same trigger and never re-routes after a specialist returns.

## Key Facts

- **Model:** sonnet
- **Tools:** Bash, Read, Glob, Grep, Task
- **Role:** read-only orchestrator; all vault writes happen inside specialists
- **Dispatch table (first match wins):**
  - `vault_exists == false` or `schema_version == ""` → onboarding agent
  - Project-intake intent + git work tree → ingest agent with `wire_project: true`
  - `autonomous == true && needs_catchup == true` → maintenance agent
  - `pending_drafts > 0` → `/claude-wiki-pages:review` skill
  - `raw_pending > 0 && degraded == blocked` → surface route error; stop
  - `raw_pending > 0 && degraded == local` → `/claude-wiki-pages:draft` skill
  - `raw_pending > 0` → ingest agent
  - `last_log_entry == "ingest"` (lint never ran) → curator agent
  - Fill-gaps / populate intent → `/claude-wiki-pages:fill-gaps` skill
  - Heal / repair intent or `graph_health.needsHeal == true` → polish agent
  - Analytical verb (`query`, `ask`, `summarize`, etc.) → analyst agent
  - Anything else → ask one clarifying question
- **Polish tail-of-write:** after ingest or curator returns successfully, the orchestrator fans out once more to the polish agent. Polish is skipped when the wizard, maintenance, analyst, or polish itself was the specialist.
- **Bash allow-list:** only `resolve-vault.sh`, `engine.sh` subcommands, `reachability.sh`, `health-score.sh`, and POSIX read-only primitives (`grep`, `find`, `wc`, `head`, `jq`, `[ -d ]`, `[ -f ]`). All other commands are prohibited.

## Related

The orchestrator is the caller of all specialist agents. It reads state from `vault/CLAUDE.md` and `vault/wiki/log.md` but never modifies them.
