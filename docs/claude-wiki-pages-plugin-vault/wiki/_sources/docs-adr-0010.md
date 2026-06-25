---
title: "ADR-0010: Durable Memory Carve-Out"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-20
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0010: Durable Memory Carve-Out

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-05-20
- **URL:** —

## Summary

ADR-0010 defines a sanctioned carve-out for agent session memory: the `Stop`/`SessionEnd` hook writes session context to `raw/agent-sessions/` as `source_type: agent-session` source files (not directly to `wiki/`). The next ingest cycle picks them up through the normal pipeline, giving agents durable memory without bypassing the provenance gate.

## Key Claims

Status: Accepted. When `CLAUDE_WIKI_PAGES_SESSION_SCRATCH` is set, `session-memory.sh` writes an idempotent source to `raw/agent-sessions/` on session stop. The file is `source_type: agent-session`, a normal source format. It is not promoted to `wiki/` directly — it goes through the `_proposed/` gate or the next maintenance ingest. This preserves the raw-immutability rule while giving the agent a memory path. The carve-out is the "protect-raw" sanctioned exception documented in the hooks contract.

Covers: Durable Memory, Agent Session Memory, Session Stop Hook, Protect-Raw Carve-Out
