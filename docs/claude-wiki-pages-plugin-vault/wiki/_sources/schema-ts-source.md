---
title: "schema.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "schema", "validation"]
aliases: ["schema.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# schema.ts Source

## Summary

`src/core/schema.ts` is the vault schema_version gate — it ports CHECK 0 from `scripts/verify-ingest.sh`. `checkSchema()` reads the vault's `CLAUDE.md`, extracts the `schema_version` value (tolerating backtick-wrapped forms like `` `schema_version`: `3` ``), and emits an error finding for unsupported or missing versions. `SUPPORTED_SCHEMA_VERSIONS` is `[1, 2, 3]`; `CURRENT_SCHEMA_VERSION` is `3`.

## Key Claims

- `SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, 2, 3]` — the closed set this engine build accepts.
- `CURRENT_SCHEMA_VERSION = 3` — the version `migrate` upgrades to and new vaults declare.
- `declaredSchemaVersion()` tolerates both `schema_version: 3` and `` `schema_version`: `3` `` forms.
- If CLAUDE.md is absent, emits an `info`-severity finding (not an error).
- If declared version is missing or unsupported, emits an `error`-severity finding.
