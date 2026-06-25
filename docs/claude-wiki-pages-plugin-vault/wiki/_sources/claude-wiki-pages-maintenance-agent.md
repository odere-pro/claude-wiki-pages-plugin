---
title: "claude-wiki-pages-maintenance-agent"
type: source
source_type: manual
source_format: text
attachment_path: ""
extracted_at: 2026-06-25
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["agents", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# claude-wiki-pages-maintenance-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-maintenance-agent.md

## Summary

Agent definition for the autonomous maintenance specialist. Runs the full catch-up loop — ingest → curator → polish → lint — in one invocation when the orchestrator detects a backlog and maintenance.enabled is on. Off by default; never runs unbidden.

## Key Claims

- maintenance.enabled must be true for this agent to be dispatched.
- Processes at most maintenance.maxPerRun sources (default 10) per run; surplus is reported as remaining backlog.
- Never makes snapshot calls of its own — it sequences specialists and each specialist git-bounds its own writes.
- Relationship to heartbeat: scripts/heartbeat.sh only recommends catch-up; this agent performs it.
- Model: sonnet. Tools: Bash, Read, Glob, Grep, Task.

Covers: Maintenance Agent, Autonomous Catch-Up, Backlog, maintenance.maxPerRun, SessionStart Heartbeat
