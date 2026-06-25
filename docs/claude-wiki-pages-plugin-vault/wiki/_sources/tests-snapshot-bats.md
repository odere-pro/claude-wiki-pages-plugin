---
title: "tests/scripts/snapshot.bats"
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

- File: `tests/scripts/snapshot.bats`
- Role: Tier 1 Bats unit test for `scripts/snapshot.sh`

## Summary

Tests the git-checkpoint snapshot wrapper. Covers the bash fallback (pre writes a checkpoint, post commits with the label), `gitCheckpoint.mode=off` as a full pass-through, no empty commits on a clean vault, always-exit-0 contract, and lock-acquire timeout (C01: skip git ops and exit 0 cleanly). Uses a fake `flock` shim for cross-platform compatibility.

## Key Claims

Covers: Bats Unit Tests, Git Checkpoint Mechanism
- Snapshot always exits 0 — it reports, never gates.
- A clean vault (no changes since pre) never produces an empty git commit.
- Lock timeout (C01) causes graceful skip rather than crash or hang.
- The bash fallback path (Bun absent) is the primary tested path; Bun-path is covered by gate-01.
