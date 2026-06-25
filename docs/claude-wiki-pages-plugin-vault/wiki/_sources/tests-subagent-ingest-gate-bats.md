---
title: "tests/scripts/subagent-ingest-gate.bats"
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

- File: `tests/scripts/subagent-ingest-gate.bats`
- Role: Tier 1 Bats unit test for `scripts/subagent-ingest-gate.sh`

## Summary

Tests the SubagentStop hook that runs `verify-ingest` after the ingest agent completes. Silent when the agent name is not `claude-wiki-pages-ingest-agent`, exits 0 gracefully when the vault is missing, and emits "QUALITY GATE" when it runs verify-ingest and the check fails.

## Key Claims

Covers: Bats Unit Tests, Subagent Quality Gate Pattern
- The gate is agent-name-scoped: other agents do not trigger it.
- Graceful degradation: missing vault or missing verify-ingest script → exit 0 (no crash).
- Uses a stub `verify-ingest.sh` that exits 1 to confirm the QUALITY GATE output fires.
