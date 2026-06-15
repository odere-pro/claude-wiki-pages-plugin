---
title: "Curator Agent Source"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["agent", "curator", "plugin"]
aliases: ["Curator Agent Source", "plugin-curator-agent", "claude-wiki-pages-curator-agent source"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Curator Agent Source

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The canonical agent definition file for `claude-wiki-pages-curator-agent`. Declares model: sonnet, tools: Bash/Read/Write/Edit/Glob/Grep. Defines a six-phase contract: Preflight (engine heal first, then verify-ingest.sh resolve), Phase 1 Diagnose (verifier + supplemental checks), Phase 2 Classify (Engine/Auto/Judgment/Report classes), Phase 3 Auto-apply safe fixes (9 ordered idempotent fixes), Phase 4 Judgment fixes (automatic, under checkpoint), Phase 5 Re-verify, Phase 6 Report and log. Safety model: git checkpoint not approval — a checkpoint commit precedes changes; rollback is `git revert`. Budget: max 500 pages per run.

## Key Claims

- Curator uses model: sonnet and tools: Bash, Read, Write, Edit, Glob, Grep (no Task).
- Safety model is "git checkpoint, not approval" — no user prompt for structural or judgment fixes.
- `engine.sh heal --json` runs in preflight; creates a git checkpoint commit then loops verify→fix→re-verify.
- Nine auto-fixes apply in order: wrap plain-string sources, fill parent/path, add title to aliases, repair folder-note children drift, repair wiki/index.md, clean ghost wikilinks in log.md, resolve broken wikilinks, connect orphans (link-only), add missing graph color groups.
- Judgment fixes (restructures, title-collision renames, body densification, near-duplicate merges) apply automatically under the checkpoint — no approval prompt.
- Curator never deletes orphan pages; never forges provenance (source orphans are Report-only).
