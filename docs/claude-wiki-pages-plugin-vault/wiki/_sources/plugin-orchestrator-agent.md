---
title: "Orchestrator Agent Source"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["agent", "orchestrator", "plugin"]
aliases: ["Orchestrator Agent Source", "plugin-orchestrator-agent", "claude-wiki-pages-orchestrator-agent source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Orchestrator Agent Source

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The canonical agent definition file for `claude-wiki-pages-orchestrator-agent`. Declares model: sonnet, tools: Bash/Read/Glob/Grep/Task. Contains the full dispatch contract: state-probe scope (filesystem-only with bounded degraded-mode exception), re-probe rule (specialists never re-probe), iteration cap (one specialist fan-out per invocation), and default-on-ambiguity (ask one clarifying question). Documents the 9-row dispatch routing table (ordered: wizard → project-intake → autonomous → drafts → blocked → local → raw-pending → lint-catch-up → fill-gaps → analyst), the polish tail step (after ingest or curator success), hand-off invariants, and the final report compose step.

## Key Claims

- The orchestrator uses model: sonnet and tools: Bash, Read, Glob, Grep, Task.
- Dispatch is a single-pass table walk; first matching row wins; no recursion.
- Specialists receive vault_path explicitly and never re-probe state.
- The orchestrator never writes wiki content; all writes happen inside specialists.
- Polish runs as a tail step after successful ingest or curator; skipped after wizard, maintenance, or analyst.
- The degraded-mode probe (ADR-0018) is the sole network call, bounded by 5s timeout, skipped when offlinePolicy is "off".
- A `wire_project: true` flag routes to ingest-agent with project-docs wiring.

## Entities Mentioned

## Concepts Mentioned
