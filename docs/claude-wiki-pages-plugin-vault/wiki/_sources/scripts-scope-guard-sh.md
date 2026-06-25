---
title: "scripts/scope-guard.sh"
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

# scripts/scope-guard.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/scope-guard.sh

## Summary

PreToolUse advisory scope warning for Read, Grep, and Glob calls. When a tool call targets a path outside the vault or outside the active skill's declared input contract, emits an advisory warning on stderr. Never blocks. Observability and interpretability tool, not an enforcement gate.

## Key Claims

Uses Bun json-tool.ts to normalise paths via realpath for consistent, symlink-resolving comparison. Extracts tool_name, file_path, path, or pattern fields from the tool-call JSON. Paths inside the vault root produce no advisory. The warning is stderr-only; exit is always 0. Enforcement is the firewall's responsibility.

Covers: Advisory Scope Warning, Read Boundary, Observability Hook
