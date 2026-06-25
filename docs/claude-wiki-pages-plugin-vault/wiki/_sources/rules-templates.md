---
title: "Template Rules"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["rules", "templates", "schema"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Template Rules

## Metadata

- **File**: `raw/repo/rules/templates.md`
- **Scope**: `vault/_templates/**`
- **Type**: Path-scoped rule file

## Summary

Governs the template files under `vault/_templates/`. Defines the seven page types that have templates (`source`, `entity`, `concept`, `topic`, `project`, `synthesis`, `index`) and the two that do not (`log`, `manifest`). Templates must match `vault/CLAUDE.md` exactly and use `{{placeholder}}` syntax.

## Key Claims

Seven templates exist: `source.md`, `entity.md`, `concept.md`, `topic.md`, `project.md`, `synthesis.md`, `index.md`. `log` and `manifest` types have no templates — minimal frontmatter only. Template fields must match `vault/CLAUDE.md` exactly. Use `{{placeholder}}` syntax for fill-in values. New templates require a matching type added to the schema. `topic`, `project`, and `manifest` were added in schema_version 2.
Covers: Template Schema, Wiki Page Types, Schema Compliance
