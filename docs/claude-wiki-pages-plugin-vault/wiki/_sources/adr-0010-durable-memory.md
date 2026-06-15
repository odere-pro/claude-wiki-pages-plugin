---
title: "ADR-0010: Durable-Memory Carve-Out"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "memory", "agent-session"]
aliases: ["ADR-0010: Durable-Memory Carve-Out"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0010: Durable-Memory Carve-Out

## Summary

Establishes the `raw/agent-sessions/` fence as the sanctioned path for durable agent memory write-backs. Only files with `source_type: agent-session` frontmatter are permitted. New-file-only (no edits). Stop/SessionEnd hooks trigger; lazy ingest promotes session learnings via the `_proposed/` review gate.

## Key Claims

- Agent session write-backs land in `raw/agent-sessions/` as new files only — no editing existing sources.
- `source_type: agent-session` frontmatter is required; any other `source_type` is blocked by `protect-raw.sh`.
- The `_proposed/` gate is the only sanctioned path for durable memory to reach `wiki/`.
- Stop/SessionEnd hooks fire to capture session learnings.
- Lazy ingest: session pages are queued as pending raw sources; the next `/claude-wiki-pages:wiki` call picks them up.
