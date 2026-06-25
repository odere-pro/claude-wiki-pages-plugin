---
title: "src/core/schema.ts — Schema Version Gate"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "schema", "verify"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/schema.ts — Schema Version Gate

## Metadata

- **Source**: `raw/repo/src/core/schema.ts`
- **Type**: TypeScript implementation

## Summary

Vault schema_version gate — ports `scripts/verify-ingest.sh` CHECK 0. Reads the vault's `CLAUDE.md`, extracts the declared `schema_version`, and validates it against the supported set.

## Key Claims

- `SUPPORTED_SCHEMA_VERSIONS`: `[1, 2, 3]`; `CURRENT_SCHEMA_VERSION = 3`
- `declaredSchemaVersion(vaultClaudeMd)`: extracts schema_version, tolerating backtick-wrapped forms
- `checkSchema(vault)`: returns `Finding[]`; empty when supported; `info` when CLAUDE.md absent; `error` when unsupported or undeclared version
- `readFileSafe` returns null rather than throwing — graceful fail-open for absent file
- Absent CLAUDE.md → `info` severity (informational skip, not counted; mirrors bash yellow line)
Covers: Schema Version Gate, checkSchema, SUPPORTED_SCHEMA_VERSIONS
