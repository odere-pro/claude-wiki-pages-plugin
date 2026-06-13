---
title: "ADR-0014: Single-Source Required Fields"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "schema", "frontmatter"]
aliases: ["ADR-0014: Single-Source Required Fields"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0014: Single-Source Required Fields

## Summary

Establishes the required-field table in `CLAUDE.md` as the machine-readable authority. `validate-frontmatter.sh` parses this table with grep/awk. Duplicate-claim checking emits WARN for exact and normalized duplicates only.

## Key Claims

- The `### Required fields by type` table in `CLAUDE.md` is the single source of truth for required fields.
- `scripts/validate-frontmatter.sh` parses this table using grep/awk only — no Bun dependency.
- Duplicate-claim detection: exact string match and normalized (whitespace-stripped) match emit WARN; fuzzy or semantic similarity is out of scope.
- The table covers all 9 page types and specifies both required and conditional fields.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Schema Authority]]
- [[Required Fields]]
- [[Frontmatter Validation]]

## Grounded Pages

Wiki pages that cite this source:

- [[Lint Rules]] — required field checks from machine-readable table
- [[Schema Authority]] — machine-readable required-fields table
