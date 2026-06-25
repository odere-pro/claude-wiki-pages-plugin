---
title: "src/data/config.ts — Configuration Loading"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "data", "config"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/data/config.ts — Configuration Loading

## Metadata

- **Source**: `raw/repo/src/data/config.ts`
- **Type**: TypeScript implementation

## Summary

Configuration loading using a four-layer merge pipeline: defaults ← user ← project ← env overrides. `Config` is a readonly plain-data interface (intentionally anemic) — encapsulation consciously waived for the merge pipeline's sake. The merged result is validated against `schemas/config.schema.json`.

## Key Claims

- Four layers (lowest to highest precedence): (1) `DEFAULT_CONFIG`, (2) user `~/.config/claude-wiki-pages/config.json`, (3) project `.claude/claude-wiki-pages.json`, (4) env `CLAUDE_WIKI_PAGES_*` leaf overrides
- `Config` interface sections: `vault`, `autoHeal`, `gitCheckpoint`, `firewall`, `maintenance`, `localModel`
- `maintenance.maxParallelExtract`: cap on parallel EXTRACT workers during ingest (default 1, clamped [1,8])
- `maintenance.unattended`: headless mode — skip Step 3 Optimize, route uncertain output to `_proposed/`, abort non-trivial plans
- `gitCheckpoint.mode`: `commit | branch | both | off`
- `autoHeal.aggressiveness`: `mechanical | structural | aggressive`
- `validateConfig`: validates against the JSON schema (enum + nested-object checks)
- Intentionally anemic: the four-layer merge pipeline uses `structuredClone` + `deepMerge` over plain objects; class wrapping would break the pipeline
- Config loading pinned by CI gate-07 (`tests/gates/gate-07-config-schema.sh`)
Covers: Config Loading, Four-Layer Merge, Config Schema, maintenance.maxParallelExtract
