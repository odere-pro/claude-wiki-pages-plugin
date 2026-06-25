---
title: "Obsidian Graph Colors Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "obsidian-graph-colors"]
aliases: ["Obsidian Graph Colors Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Obsidian Graph Colors Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/obsidian-graph-colors/SKILL.md`
- Type: Skill definition for the `obsidian-graph-colors` verb

## Summary

The `obsidian-graph-colors` skill applies per-topic color groups to the Obsidian graph view using the internal graph plugin API via `obsidian eval`, with a documented headless fallback that writes `vault/.obsidian/graph.json` directly when the CLI is unavailable.

## Key Claims

Covers: Obsidian Graph Colors Skill, Initial Graph Configuration, Color Group Apply Contract, Headless Fallback, app.json Exclusions.

Initial graph configuration: five deterministic filter defaults (island filter search string excluding `_sources`/`_synthesis`/`log`, `showTags: false`, `showAttachments: false`, `hideUnresolved: true`, `showOrphans: true`); `colorGroups` starts empty. The `app.json` scaffold sets `userIgnoreFilters` (raw/, _templates/, _proposed/, _inbox/, output/, CLAUDE.md, wiki/log.md) and three new-file routing keys (`newFileLocation: "folder"`, `newFileFolderPath: "_inbox"`, `newLinkFormat: "shortest"`). The headless fallback prints exactly `[fallback] graph-colors: wrote .obsidian/graph.json directly (restart Obsidian to load)`.
