---
title: "Raw Immutability Rule"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["rules", "raw", "immutability"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Raw Immutability Rule

## Metadata

- **File**: `raw/repo/rules/raw-immutable.md`
- **Scope**: `vault/raw/**`
- **Type**: Path-scoped rule file

## Summary

Enforces the immutability contract for source files under `vault/raw/`. Files placed there must never be modified, renamed, or deleted. Corrections belong in the wiki, not in the raw file. The rule names `/claude-wiki-pages:ingest` as the only sanctioned processing path.

## Key Claims

`vault/raw/` files are immutable after placement. Do not edit, rename, or delete them. To add a new source, create or copy the file into `vault/raw/`. Corrections to source content are recorded in the wiki page, not the raw file. Processing goes through `/claude-wiki-pages:ingest`.
Covers: Raw Immutability, Ingest Pipeline, Source Protection
