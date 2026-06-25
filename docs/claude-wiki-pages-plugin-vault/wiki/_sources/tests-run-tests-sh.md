---
title: "tests/run-tests.sh — Test Runner"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "tooling"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/run-tests.sh`
- Role: Central test orchestrator; drives Tier 0–Tier 2 and the engine gates

## Summary

Provides a `run` wrapper that accepts a tier target (tier0, tier1, tier2, tier3, gates, eval, all) and executes the corresponding check suite. Tier 0 runs shellcheck, shfmt, markdownlint, lychee, gitleaks, manifest parse, and validate-docs. Tier 1 runs `bats --recursive tests/scripts/` with GNU parallel when available. Tier 2 runs the two smoke scripts. Tier 3 is a permanently dropped stub. The eval tier is opt-in and requires `CLAUDE_WIKI_PAGES_EVAL_MODEL`.

## Key Claims

Covers: Four-Tier Test Structure, Test Gates, Eval Quality Gate
- Default run (no tier argument) executes Tier 0 + Tier 1 only.
- GNU parallel is used for cross-file Bats parallelism when available; `--no-parallelize-within-files` keeps each file serial.
- Tier 3 (local-embedding re-ranker) is permanently dropped per §5/§11.1.
- `--list` flag prints commands without executing — useful for auditing.
