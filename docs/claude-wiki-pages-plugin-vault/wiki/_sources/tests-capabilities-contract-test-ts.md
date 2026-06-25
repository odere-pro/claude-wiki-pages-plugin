---
title: "tests/engine/capabilities-contract.test.ts"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "engine"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/engine/capabilities-contract.test.ts`
- Role: P3.2 verb-drift contract test — pins the CLI verb set to a hardcoded golden list

## Summary

Asserts three invariants: every IMPLEMENTED verb exits != 2 when called with `--json --target /nonexistent` (has a live dispatch branch), every PLANNED verb exits 0 with `.status === 'not-implemented'`, and `capabilities --json` verb names set-equal the golden list. Uses `Bun.spawnSync` to invoke the real CLI. The golden list is hardcoded to prevent silent drift.

## Key Claims

Covers: Engine Test Suite, Verb-Drift Contract Testing
- Exit code 2 means "unknown command" (fallthrough) — the specific assertion is exit != 2, not exit 0.
- Adding a table row with "implemented" status but no dispatch branch causes exit 2 — caught by assertion (a).
- The golden list must be updated by hand when a new verb ships — that deliberate friction is the point.
