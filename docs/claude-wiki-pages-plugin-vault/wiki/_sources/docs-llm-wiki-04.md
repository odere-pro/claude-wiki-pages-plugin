---
title: "LLM Wiki Guide 04 — Review, Validate, and Fix"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "llm-wiki", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# LLM Wiki Guide 04 — Review, Validate, and Fix

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

Guide 04 explains the lint, validate, and fix cycle. It covers running `/claude-wiki-pages:doctor` for a health check, reviewing `_proposed/` drafts via `/claude-wiki-pages:review`, and triggering the curator agent for structural self-heal. The guide distinguishes structural errors (schema violations, blocked by validator) from quality warnings (dangling links, orphans, stale pages).

## Key Claims

Health check: `/claude-wiki-pages:doctor` runs `verify-ingest.sh` and reports errors, warnings, and info items. Structural self-heal: the curator agent runs `engine.sh heal` (deterministic, git-checkpointed) then judgment fixes. Review workflow: `_proposed/` drafts from a local model or agent session are reviewed via `/claude-wiki-pages:review`; approval promotes to `wiki/` under a git checkpoint. Lint recommended schedule: every 10 ingests or monthly. The curator's heal is automatic and fully reversible via `git revert`.

Covers: Lint Cycle, Doctor Health Check, Proposed Draft Review, Curator Self-Heal, validate-ingest
