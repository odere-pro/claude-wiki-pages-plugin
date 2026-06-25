---
title: "Contributing Guide"
type: source
source_type: manual
source_format: text
url: "https://github.com/odere-pro/claude-wiki-pages-plugin/blob/main/CONTRIBUTING.md"
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["root", "contributing", "development"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Contributing Guide

## Metadata

- **File**: `raw/repo/root/CONTRIBUTING.md`
- **Scope**: Contributor workflow and ground rules
- **Type**: Contributing documentation

## Summary

Short contributing guide covering ground rules, how to propose a change (issue-first, focused PRs, CHANGELOG update), the local test loop, local development workflow with direct plugin loading, and things that won't be merged.

## Key Claims

Ground rules: schema is authoritative (skills/init/template/CLAUDE.md), the four layers are load-bearing (state which layer a change belongs to), hooks and scripts are coupled (never rename a hook script without updating hooks.json), provenance over prose. PR process: open issue first → wait for feedback → focused PRs → update CHANGELOG.md. Test loop: `bash tests/install-deps.sh` (idempotent), `bash tests/run-tests.sh` (Tier 0+1, accepts tier0/tier1/tier2/tier3/--list). Pre-commit: `pre-commit install`. Local dev: `/plugin marketplace add /absolute/path/` then `/plugin install claude-wiki-pages@claude-wiki-pages`. Things that won't merge: weakened frontmatter validation, network-access dependencies during ingest/query, hidden telemetry, `eval` on vault content.
Covers: Contributing, Ground Rules, Local Test Loop, PR Process, Plugin Development
