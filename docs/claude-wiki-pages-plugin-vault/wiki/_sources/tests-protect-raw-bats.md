---
title: "tests/scripts/protect-raw.bats"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "bats"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/scripts/protect-raw.bats`
- Role: Tier 1 Bats unit test for `scripts/protect-raw.sh`

## Summary

Tests the raw immutability guard. Blocks any Edit to `vault/raw/**`, blocks Write to an existing raw file (overwrite prevention), allows Write to a NEW raw file (new source intake), and passes through non-vault paths with no output.

## Key Claims

Covers: Raw Immutability, Hook JSON Protocol, Bats Unit Tests
- New raw file writes (source intake) are allowed — blocking would prevent source ingestion.
- Overwrites of existing raw files are blocked ("Cannot overwrite").
- Edit operations on any raw/ path are always blocked regardless of whether the file exists.
