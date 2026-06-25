---
title: "scripts/validate-frontmatter.sh"
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

# scripts/validate-frontmatter.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/validate-frontmatter.sh

## Summary

PreToolUse hook blocking writes to vault/wiki/ with missing required frontmatter fields. Both the hot-path PreToolUse hook and CLI batch validation modes are now delegated to the Bun engine (`src/core/frontmatter-validate.ts`), which uses a real yaml parser and reads required-field rules from the schema's "Required fields by type" table.

## Key Claims

Fail-closed security gate: when Bun is absent the hook blocks wiki writes with an install-Bun reason; CLI mode exits 2. Uses hook mode (`engine hook --gate frontmatter`) for PreToolUse and CLI mode (`engine hook --gate frontmatter --cli`) for batch validation. Required-field rules are single-sourced from CLAUDE.md ADR-0014.

Covers: Frontmatter Validation, Required Fields Enforcement, Schema Validation Gate
