---
title: "tests/scripts/validate-frontmatter.bats"
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

- File: `tests/scripts/validate-frontmatter.bats`
- Role: Tier 1 Bats unit test for `scripts/validate-frontmatter.sh`

## Summary

Tests the PreToolUse frontmatter validation hook. The `setup_file` function creates a stub `vault/CLAUDE.md` with the Required fields table so the script can read it at gate time. Tests cover the allow path (clean entity write), non-wiki path passthrough, missing type field (block), and the legacy `type: moc` ban.

## Key Claims

Covers: Bats Unit Tests, Frontmatter Schema Enforcement, Hook JSON Protocol
- Blocks signal `"decision":"block"` on stdout; the hook exits 0 either way.
- The test creates its own schema stub at `vault/CLAUDE.md` — tests are independent of the real vault schema file.
- Non-wiki paths pass through with no output and exit 0.
