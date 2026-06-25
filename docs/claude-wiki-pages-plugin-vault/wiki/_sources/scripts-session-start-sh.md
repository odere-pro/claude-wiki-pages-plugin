---
title: "scripts/session-start.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/session-start.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/session-start.sh

## Summary

SessionStart hook that initialises plugin settings and prints a schema reminder. Emits an INDEX pointer to the vault's wiki/index.md (MOC) so the agent orients to the table of contents at session start without loading its content into context. Computes a pending-source count by comparing raw/ file mtimes against the log.md mtime to produce a NEXT action suggestion.

## Key Claims

Emits REMINDER, INDEX, NEXT, ERROR, and NOTICE lines. Pending source count compares file mtimes against log.md (not a total count of all raw files) to avoid overstating backlog. Surfaces Bun-absent and jq-absent warnings loudly because their absence causes hooks to fail open or degrade. Resolves vault to absolute canonical path using cd+pwd -P so the INDEX pointer is never a relative path.

Covers: Session Initialization, MOC Pointer, Pending Source Detection, Bun Requirement Notice
