---
title: "Config Schema JSON"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["schemas", "config", "json-schema", "validation"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Config Schema JSON

## Metadata

- **File**: `raw/repo/schemas/config.schema.json`
- **Scope**: Plugin configuration validation
- **Type**: JSON Schema (draft-07)

## Summary

The complete JSON Schema for the claude-wiki-pages plugin configuration. Defines all valid keys, their types, enums, defaults, and descriptions across eight top-level properties. The schema is closed with `additionalProperties: false` at every level.

## Key Claims

Version is a const integer (must be `1`). `vault.path` is an optional string — when omitted, four-tier resolution applies. `autoHeal` has `enabled` (boolean, default true), `aggressiveness` (enum: mechanical/structural/aggressive, default structural), and `maxIterations` (integer 1–20, default 5). `gitCheckpoint.mode` enum: commit/branch/both/off (default commit); `push` enum: off/auto (default off). `firewall` has `enabled`, `mode` (enforce/warn/off), `allowPaths`, and `denyPaths` (defaults block `.ssh`, `.aws`, `.env`, `.git/config`). `maintenance` has `enabled`, `autoCatchupOnSessionStart`, `lintEveryDays`, `maxPerRun` (1–50, default 10), `cooldownMinutes`, `maxParallelExtract` (1–8, default 1), `unattended`, and `syncWiredOnRun`. `localModel` covers `enabled`, `provider` (ollama/lmstudio), `endpoint`, `model`, `draftTarget`, `tier` (draft/ingest-extract/query), and `offlinePolicy` (strict/prefer-local/off). `modelHints` is a free-form object of string values.
Covers: Config Schema, AutoHeal, GitCheckpoint, Firewall, Maintenance, LocalModel, Plugin Configuration
