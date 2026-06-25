---
title: "Curator Fixes Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "curator-fixes"]
aliases: ["Curator Fixes Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Curator Fixes Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/curator-fixes/SKILL.md`
- Type: Skill definition for the `curator-fixes` reference skill

## Summary

The `curator-fixes` skill documents the supplemental diagnostic checks, nine auto-fix catalog entries, automatic judgment-fix procedure, and lint-report template for the curator agent. Reference material — not an action.

## Key Claims

Covers: Curator Fixes Skill, Supplemental Checks, Nine Auto-Fixes, Ghost Wikilink Repair, Orphan Connection, Stale-Memory Handling.

Supplemental checks beyond the script: broken wikilinks, orphan pages, title collisions, title missing from aliases, missing graph color groups, flat folder sprawl (>12 children), excessive nesting (>4 levels), stale confidence, high confidence with single source, ghost wikilinks in `log.md`. Nine auto-fixes: wrap plain-string sources, fill missing parent/path, add title to aliases, repair folder-note children drift, repair `wiki/index.md`, clean ghost wikilinks in log, resolve broken/ghost wikilinks (piped basename form only), connect orphan pages (link to folder note only). No memory-specific auto-deletion for agent-session sources.
