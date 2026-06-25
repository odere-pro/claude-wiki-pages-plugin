---
title: "scripts/verify-ingest.sh"
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

# scripts/verify-ingest.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/verify-ingest.sh

## Summary

Post-ingest verification script that checks for duplicate index entries, wikilink format in sources fields, index consistency, dangling links, orphan sources, and schema version support. The bash twin of the Bun engine's verify command, kept in parity via gate-05.

## Key Claims

Supports YAML list shapes: inline flow (`sources: ["[[A]]"]`), multi-line flow, and block dash lists. Checks that sources fields contain wikilink-formatted entries (not bare strings). Verifies derived: true pages have confidence below DERIVED_CONFIDENCE_CEILING (0.8). Shared `_extract_yaml_list` helper and `_fm_title` extractor prevent code duplication. Exit 0 = clean, exit 1 = issues found.

Covers: Post-Ingest Verification, Wikilink Format Check, Index Consistency, Orphan Source Detection, Schema Validation
