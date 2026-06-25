---
title: "tests/scripts/strict-tree-reduce.bats"
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

- File: `tests/scripts/strict-tree-reduce.bats`
- Role: Tier 1 Bats unit test for `scripts/strict-tree-reduce.sh` (ADR-0036)

## Summary

Tests the strict-tree remediation script against the `tests/fixtures/tangled-vault` fixture. Verifies dry-run writes nothing, `--apply` yields `treeConformance=1` and `nonSpineEdgeCount=0`, tag de-cycling adds `topic/<tree>` tags for demoted cross-tree edges, spine and provenance fields are never touched, and a second `--apply` is idempotent (changes 0 files).

## Key Claims

Covers: Strict Tree Topology, Bats Unit Tests, Graph Quality Metrics
- The tangled-vault fixture has deliberate non-spine wikilinks to serve as a reproducible before-state.
- After `--apply`, graph-quality.ts must report treeConformance=1 and crossTreeEdgeCount=0.
- Idempotency is a first-class contract: the second apply must change 0 files.
