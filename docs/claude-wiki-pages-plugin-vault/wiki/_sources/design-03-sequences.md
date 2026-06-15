---
title: "Design: Sequences"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "sequences", "ingest"]
aliases: ["Design: Sequences"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design: Sequences

## Summary

L3 sequence diagrams for: Session start, Ingest write-path, Agent write-back with human approval (durable memory via `_proposed/`).

## Key Claims

- Session start: `session-start.sh` → vault status → heartbeat recommendation if backlog → session ready.
- Ingest write-path: user → `/wiki` → orchestrator → state probe → ingest agent → snapshot pre → write pages → snapshot post → curator agent → polish agent → `SubagentStop` backstop.
- Agent write-back: agent → `raw/agent-sessions/` (new file only, `source_type: agent-session`) → Stop hook → `_proposed/` staging → human review gate → promotion to `wiki/`.
- Every write phase is git-checkpointed with a pre-snapshot and a post-snapshot commit.
