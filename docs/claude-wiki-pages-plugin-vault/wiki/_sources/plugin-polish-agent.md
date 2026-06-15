---
title: "Polish Agent Source"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["agent", "polish", "plugin"]
aliases: ["Polish Agent Source", "plugin-polish-agent", "claude-wiki-pages-polish-agent source"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Polish Agent Source

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The canonical agent definition file for `claude-wiki-pages-polish-agent`. Declares model: sonnet, tools: Bash/Read/Write/Edit/Glob/Grep. Defines three idempotent steps: (1) Graph colors — ensure every top-level topic folder has a color group in `.obsidian/graph.json`, apply wiki-only exclusions to `app.json`; (2) Regenerate `wiki/index.md` — stable alphabetical order, preserve user prose; (3) Per-folder MOC consistency — append-only children/child_indexes reconciliation. Git-bounding: `snapshot.sh pre` before Step 1, `snapshot.sh post` after Step 3. Final report format: POLISH: graph-colors, index-refresh, moc-consistency lines.

## Key Claims

- Polish agent uses model: sonnet and tools: Bash, Read, Write, Edit, Glob, Grep (no Task).
- Strictly append-only and idempotent: two consecutive runs produce zero diffs.
- Graph colors: headless fallback writes `.obsidian/graph.json` directly when `obsidian eval` is unavailable.
- Wiki-only exclusions: `app.json → userIgnoreFilters` must contain raw/, \_templates/, \_proposed/.
- Per-folder MOC: never removes a children: or child_indexes: entry (curator owns removal flow).
- The agent is not user-invocable directly; invoked by the orchestrator as tail-of-write step.
- Final report is exactly the POLISH: block with three sub-lines.

## Entities Mentioned

- [[Polish Agent]]

## Concepts Covered

- [[Agent Contract Table]]
- [[Agent Tool Restriction]]
- [[Git Checkpoint]]
- [[Graph Quality]]

## Grounded Pages

Wiki pages that cite this source:

- [[Polish Agent]] — primary source for three idempotent steps and POLISH: report format
- [[Agent Contract Table]] — per-agent contract pattern sourced here
- [[Agent Tool Restriction]] — tool restriction (no Task)
- [[Git Checkpoint]] — snapshot.sh pre/post git-bounding documented here
