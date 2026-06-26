---
title: "ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-10
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-10
- **URL:** —

## Summary

ADR-0014 makes the required-fields table in `vault/CLAUDE.md` the single source of truth for frontmatter validation, and adds a duplicate-claim warning to the ingest pipeline. `validate-frontmatter.sh` parses the table by grep/awk only (no Bun dependency). The duplicate-claim check flags when two pages make the same claim from the same source.

## Key Claims

Status: Accepted. The required-fields table (§ Required fields by type) in CLAUDE.md is the authoritative contract; `validate-frontmatter.sh` reads it via grep/awk at gate time. Changing a required field means editing only that table. The duplicate-claim warning (`check-duplicate-claims.sh`) runs post-ingest and produces a WARN (not block) when two pages cite the same exact claim from the same source — this signals a merge candidate.

Covers: Single-Source Required Fields, Frontmatter Validation, Duplicate-Claim Warning, validate-frontmatter.sh
