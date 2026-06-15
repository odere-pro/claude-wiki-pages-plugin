---
title: "Ingest Agent Source"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["agent", "ingest", "plugin"]
aliases: ["Ingest Agent Source", "plugin-ingest-agent", "claude-wiki-pages-ingest-agent source"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Ingest Agent Source

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The canonical agent definition file for `claude-wiki-pages-ingest-agent`. Declares model: sonnet, tools: Bash/Read/Write/Edit/Glob/Grep/Task. Specifies the full four-step pipeline contract: Step 1 Ingest (with sub-steps 1.0 project intake, 1.1 backlog via engine.sh, 1.2 read sources, 1.3 source summaries, 1.4 plan gate, 1.5 create/update pages, 1.6 folder notes, 1.6b structural self-check, 1.7 polish marker, 1.8 log append, 1.9 snapshot post), Step 2 Auto-heal (curator delegation), Step 3 Optimize (opt-in destructive gate), Step 4 Synthesize. Budget: max 25 sources per run; retry cap: two lint-fix sub-agent runs; plan gate requires approval at 1.4.

## Key Claims

- Ingest agent uses model: sonnet and tools: Bash, Read, Write, Edit, Glob, Grep, Task.
- Step 1.4 plan gate is a hard stop: no page writes without explicit approval.
- Step 3 (Optimize) requires explicit confirmation before any `git mv`.
- Step 2 delegates to `claude-wiki-pages-curator-agent` — no inline lint loop.
- `engine.sh backlog --json` is the single source of truth for pending sources.
- Parallel fan-out (maxParallelExtract > 1) spawns extract worker Tasks that hold only Read/Glob/Grep.
- Structural self-check (step 1.6b) via `lint-structural.sh` is a distinct gate from `verify-ingest.sh`.
