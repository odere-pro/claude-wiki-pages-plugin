---
title: "tests/scripts/verify-ingest.bats"
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

- File: `tests/scripts/verify-ingest.bats`
- Role: Tier 1 Bats unit test for `scripts/verify-ingest.sh`

## Summary

Tests the verify-ingest script against the minimal-vault fixture. Covers the happy path (exit 0 on a clean vault), the legacy `_index.md` name (WARN at schema_version 3, exit 0), back-compat with v2 vaults (no warning), duplicate index entries (exit 1), and plain-string sources (exit 1 on missing wikilink syntax).

## Key Claims

Covers: Bats Unit Tests, Vault Structural Verification, Schema Version Compatibility
- Each CHECK is pinned by its specific success string, not just the final summary — guards against a mutation that silences an individual check.
- The folder note (schema v3) is accepted; the legacy `_index.md` name draws `legacy-index-filename` WARN but is not an error.
- Orphan source summaries emit a WARN but do not cause exit 1.
