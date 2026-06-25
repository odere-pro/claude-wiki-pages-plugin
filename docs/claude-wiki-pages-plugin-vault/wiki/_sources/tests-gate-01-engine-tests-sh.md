---
title: "tests/gates/gate-01-engine-tests.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "gates"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/gates/gate-01-engine-tests.sh`
- Role: CI engine gate — runs the Bun test suite with coverage thresholds

## Summary

The simplest gate: runs `bun test src/ tests/engine/` covering both colocated source tests and engine-level contract tests. Self-skips when Bun is not installed. Coverage thresholds are enforced via `bunfig.toml`. Failure means an engine test failed or a coverage threshold was missed.

## Key Claims

Covers: Engine Test Suite, CI Gates
- Self-skip pattern: checks `command -v bun` and exits 0 with "SKIP" if absent, keeping the suite green on bare shell boxes.
- Tests under `tests/engine/` are engine-level contract tests separate from unit tests under `src/`.
- This is the first gate run — failures here block all subsequent gates.
