---
title: "Schema Check"
type: concept
aliases: ["schema-check", "schema_version gate", "checkSchema", "CHECK 0"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-schema|src/core/schema.ts — Schema Version Gate]]"]
related: []
tags: ["src", "core", "schema", "verify"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Schema Check

CHECK 0 in the verify pipeline. Gates whether the vault's `CLAUDE.md` declares a supported `schema_version`. `core/schema.ts` is the sole module for this check.

## Definition

The schema_version gate reads the vault's `CLAUDE.md`, extracts the declared `schema_version`, and validates it against the supported set. It is the first check run in the `verify` command.

## Key Principles

**Supported versions**: `[1, 2, 3]`. `CURRENT_SCHEMA_VERSION = 3`.

**`checkSchema(vault)`**: returns a `Finding[]`. Empty when supported or `CLAUDE.md` is absent (info-severity when absent — informational skip, not a warning; mirrors the bash yellow line NOT counted).

**`declaredSchemaVersion(vaultClaudeMd)`**: extracts the first `schema_version: N` declaration from `CLAUDE.md`, tolerating backtick-wrapped forms (`` `schema_version`: `3` ``).

**Severity model**: absent `CLAUDE.md` → `info` (informational skip); declared but unsupported version → `error`; no `schema_version` declared → `error`.

**Fail-open for absent file**: `readFileSafe` returns `null` rather than throwing. The check proceeds gracefully.

## Examples

- `schema_version: 3` → clean (no findings)
- Missing `CLAUDE.md` → `info` finding (skipped, not counted)
- `schema_version: 0` → `error` finding (unsupported version)
- Missing `schema_version` declaration → `error` finding

## Related Concepts

- Part of the `verify` command's check composition
- The current schema authority lives in `skills/init/template/CLAUDE.md` (the shipped schema)
- Vaults on schema_version 1 or 2 remain valid — each version is a strict superset of the previous
