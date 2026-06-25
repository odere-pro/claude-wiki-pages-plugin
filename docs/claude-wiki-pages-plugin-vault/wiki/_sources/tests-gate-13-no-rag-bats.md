---
title: "tests/scripts/gate-13-no-rag.bats"
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

- File: `tests/scripts/gate-13-no-rag.bats`
- Role: Tier 1 Bats unit test for the NO-RAG gate's self-test mode

## Summary

Tests the NO-RAG invariant gate's fail-closed self-test: planted forbidden tokens (fetch, vector, .embed) in temp files must be caught; the real retrieval path must pass clean; a planted forbidden token in a real scanned file must cause the gate to fail. Directly reproduces the historic fail-open regression caused by unbalanced parens in grep patterns.

## Key Claims

Covers: NO-RAG Invariant, Adversarial Testing, Bats Unit Tests
- This test is a self-test of a gate's self-test — meta-level enforcement.
- The fail-open reproduction: `grep -nE 'fetch('` errors (exit 2), and under pipefail without `-e`, that error was silently swallowed. The gate now uses escaped ERE patterns.
- A planted token in a real retrieval file must cause exit non-zero (failure, not false pass).
