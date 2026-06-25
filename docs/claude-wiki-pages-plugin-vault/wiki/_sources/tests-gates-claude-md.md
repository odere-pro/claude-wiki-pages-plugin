---
title: "tests/gates/CLAUDE.md — Gates Documentation"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "documentation"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/gates/CLAUDE.md`
- Role: Orientation map and reference table for all CI engine gates

## Summary

Documents the 14 engine gates (gate-01 through gate-13, with two gate-11 variants) and their enforcement targets. Gates cover: bun test coverage, typecheck, shellcheck, glossary, verify/firewall parity, no-absolute-paths, config schema, prettier, npm-pack surface, markdownlint, eslint, golden-snapshot firewall, stale-dist, and the NO-RAG static invariant.

## Key Claims

Covers: CI Gates, Engine Test Suite, NO-RAG Invariant
- Gates run after the Bats suite (Tier 1) and cover the Bun engine surface the shell tiers cannot.
- Two gate-11 files run concurrently: eslint and firewall-parity — duplicate number is intentional.
- Gate-12 (stale-dist) self-skips when `dist/cli.js` is absent, so contributors who have not built do not see a false failure.
- `run-all.sh` globs `gate-*.sh` in filename order — new gates are picked up automatically.
