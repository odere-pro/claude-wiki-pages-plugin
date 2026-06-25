---
title: "tests/scripts/firewall.bats"
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

- File: `tests/scripts/firewall.bats`
- Role: Tier 1 Bats unit test for `scripts/firewall.sh`

## Summary

Tests the firewall hook: allows writes inside the resolved vault, blocks writes outside, blocks deny globs (e.g., `**/.env`), respects `mode: off` project config as a pass-through, and enforces cross-vault confinement (write to a registered sibling vault is blocked under `enforce` mode).

## Key Claims

Covers: Write-Path Firewall, Hook JSON Protocol, Bats Unit Tests
- `mode: off` in `.claude/claude-wiki-pages.json` disables the firewall entirely.
- Cross-vault confinement: `CLAUDE_WIKI_PAGES_OTHER_VAULTS` env var lists sibling vaults; writes to them are blocked under enforce mode.
- Block verdict uses `"decision":"block"` on stdout with exit 0 (PreToolUse contract).
