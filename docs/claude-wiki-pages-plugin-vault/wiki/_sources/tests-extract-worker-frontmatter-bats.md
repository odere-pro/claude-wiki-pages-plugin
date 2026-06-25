---
title: "tests/scripts/extract-worker-frontmatter.bats"
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

- File: `tests/scripts/extract-worker-frontmatter.bats`
- Role: P1-A1 gate — verifies the extract-worker agent's read-only tool restriction

## Summary

Verifies that `agents/claude-wiki-pages-extract-worker-agent.md` exists, its `tools:` frontmatter line contains exactly Read, Glob, Grep and does NOT contain Write, Edit, or Bash, and that the ingest-agent references the extract-worker so the fan-out step is documented.

## Key Claims

Covers: Extract Worker Safety Boundary, Bats Unit Tests
- This is a hard safety boundary: an extract worker with write tools is no longer read-only.
- The test enforces a structural invariant in the agent file, not runtime behavior.
- Serves as a Tier-1 grep gate for the parallel-extract fan-out contract (ADR-0026).
