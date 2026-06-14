---
title: "Maintenance Agent Source"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["agent", "maintenance", "plugin"]
aliases:
  [
    "Maintenance Agent Source",
    "plugin-maintenance-agent",
    "claude-wiki-pages-maintenance-agent source",
  ]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Maintenance Agent Source

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The canonical agent definition file for `claude-wiki-pages-maintenance-agent`. Declares model: sonnet, tools: Bash/Read/Glob/Grep/Task. Defines a three-step contract: (1) Probe the backlog via `engine.sh backlog --json`, (2) Run the catch-up loop (ingest → curator → polish → lint) bounded by `maintenance.maxPerRun`, (3) Report. Each sub-agent already git-bounds its own writes; the maintenance agent makes no snapshot calls of its own. Off by default (`maintenance.enabled: false`); never runs unbidden. Relationship to heartbeat: `heartbeat.sh` recommends catch-up; this agent performs it.

## Key Claims

- Maintenance agent uses model: sonnet and tools: Bash, Read, Glob, Grep, Task.
- Off by default — only active when `maintenance.enabled: true`.
- Budget is `maintenance.maxPerRun` sources per run (default 10); surplus reported as remaining backlog.
- The agent sequences specialists (ingest → curator → polish → lint) but writes nothing directly.
- If `needsCatchup` is false, returns immediately with "vault is up to date" — no writes, no git churn.
- `heartbeat.sh` (SessionStart) recommends catch-up; this agent is the LLM step that actually performs it.

## Entities Mentioned

## Concepts Mentioned
