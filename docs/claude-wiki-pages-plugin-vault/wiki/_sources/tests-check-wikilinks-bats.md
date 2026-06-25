---
title: "tests/scripts/check-wikilinks.bats"
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

- File: `tests/scripts/check-wikilinks.bats`
- Role: Tier 1 Bats unit test for `scripts/check-wikilinks.sh`

## Summary

Tests the PreToolUse wikilink format guard. Allows `[[wikilinks]]` and bare HTTP URLs in wiki bodies, blocks raw markdown-link syntax (parenthesized file references) in wiki paths, and ignores non-wiki paths entirely.

## Key Claims

Covers: Wiki Page Format, Hook JSON Protocol, Bats Unit Tests
- Uses a fixture containing both a `[[wikilink]]` and a bare HTTP URL to pin the discrimination — the guard must not over-match on HTTP links.
- The block message names the specific pattern found, enabling targeted correction.
- Non-wiki paths pass through silently regardless of their link syntax.
