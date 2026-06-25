---
title: "Architecture"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "architecture"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Architecture

## Metadata

- File: `raw/repo/docs/architecture.md`
- Type: plugin documentation

## Summary

Describes the four-layer stack that implements Karpathy's LLM Wiki pattern as a Claude Code plugin. Each layer (Data, Skills, Agents, Orchestration) catches a different class of failure and is implemented with a different tool.

## Key Claims

The plugin is a four-layer implementation: Layer 1 Data (raw/ + wiki/ + CLAUDE.md), Layer 2 Skills (26 single-responsibility capabilities), Layer 3 Agents (8 multi-step executors), Layer 4 Orchestration (hooks, rules, scripts). Provenance is structural — every wiki page carries a sources: field. The vault forms a strict tree in Obsidian's graph view. The deterministic engine (Bun CLI) exposes verbs verify, lint, backlog, context, okf, snapshot without spawning an LLM. Data flow: human drops source → /wiki → skill reads schema → writes _sources/ summary → hooks fire → entities/concepts extracted → folder notes updated → log.md appended → SubagentStop runs verify-ingest.sh.

Covers: Four-Layer Stack, Architecture, Obsidian Graph, Deterministic Engine, Data Flow
