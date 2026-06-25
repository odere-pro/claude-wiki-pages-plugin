---
title: "Wiki Command"
type: entity
entity_type: tool
aliases: ["Wiki Command", "/claude-wiki-pages:wiki", "wiki slash command"]
parent: "[[commands|Commands]]"
path: "commands"
sources: ["[[wiki-command|wiki command (/claude-wiki-pages:wiki)]]"]
related: []
tags: ["commands", "entry-point", "slash-command", "orchestrator"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Wiki Command

The single advertised entry verb for claude-wiki-pages: the user types `/claude-wiki-pages:wiki` and the plugin figures out what to do next.

## Overview

`/claude-wiki-pages:wiki` is the top-level slash command for claude-wiki-pages. It is the one verb end-users need to know. The command probes vault state (vault path, schema version, raw/ count, last log.md entry) and delegates everything to the orchestrator agent via `Task` — the command itself does no routing, no reading of wiki pages, and no writing.

The user may optionally supply a free-form goal as `$ARGUMENTS` (e.g., "ingest the new papers" or "what does the wiki say about retrieval?"). If `$ARGUMENTS` is empty, the orchestrator still runs and probes state autonomously.

## Key Facts

- **Invocation:** `/claude-wiki-pages:wiki [optional free-form goal]`
- **Allowed tools:** Task, Bash, Read, Glob, Grep
- **Delegation target:** `claude-wiki-pages-orchestrator-agent` via Task
- **No pre-classification:** the user's prompt is passed verbatim; routing is the orchestrator's job
- **Covers all states:** fresh install, new sources in raw/, backlog catch-up, natural-language question, health-check routing
- **Companion command:** `/claude-wiki-pages:doctor` for environment health checks before a wiki run

## Related

The wiki command is the Layer 4 (Orchestration) entry point that triggers the Layer 3 (Agents) orchestrator, which in turn dispatches Layer 2 (Skills) and other Layer 3 agents.
