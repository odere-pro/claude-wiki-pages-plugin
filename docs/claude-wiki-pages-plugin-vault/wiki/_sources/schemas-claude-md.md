---
title: "Schemas Directory README"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["schemas", "config", "json-schema"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Schemas Directory README

## Metadata

- **File**: `raw/repo/schemas/CLAUDE.md`
- **Scope**: `schemas/` directory documentation
- **Type**: Directory README

## Summary

Documents the `schemas/` directory, which holds the JSON Schema (`config.schema.json`) that validates both user-level and project-level plugin configuration. The schema ships in the npm package, uses draft-07, and is closed (`additionalProperties: false`) at every level. It validates eight top-level sections. The `gate-07` CI check keeps this schema in lockstep with `templates/default.config.json`.

## Key Claims

`config.schema.json` is a draft-07 JSON Schema that validates `~/.config/claude-wiki-pages/config.json` (user config) and `.claude/claude-wiki-pages.json` (project config). Consumed by `src/data/config/config.ts` (`validateConfig`) and surfaced through `claude-wiki-pages config validate`. The schema ships in the npm package via the `files` array in `package.json`. It is closed (`additionalProperties: false`) at every level — unknown keys are a hard error. Validated sections: `version`, `vault.path`, `autoHeal`, `gitCheckpoint`, `firewall`, `maintenance`, `localModel`, `modelHints`. Must stay in lockstep with `templates/default.config.json` (enforced by `gate-07`).
Covers: Config Schema, JSON Schema, Plugin Configuration, Gate-07
