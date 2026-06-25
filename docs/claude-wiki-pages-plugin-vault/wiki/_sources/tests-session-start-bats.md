---
title: "tests/scripts/session-start.bats"
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

- File: `tests/scripts/session-start.bats`
- Role: Tier 1 Bats unit test for `scripts/session-start.sh`

## Summary

Tests the SessionStart hook behavior: prints SETUP when the vault directory does not exist, REMINDER when it exists, creates `settings.json` on first run, emits a MOC pointer (INDEX:) when `wiki/index.md` is present, omits it when absent, and always prints a NEXT: line.

## Key Claims

Covers: Bats Unit Tests, Session Management
- Two distinct output modes depending on vault state: SETUP (onboarding) vs REMINDER (continuing work).
- `settings.json` creation is tested by asserting file existence after the first run.
- The MOC pointer helps the LLM navigate immediately after session start.
