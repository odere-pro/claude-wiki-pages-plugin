---
title: "Review Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "review"]
aliases: ["Review Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Review Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/review/SKILL.md`
- Type: Skill definition for the `review` verb

## Summary

The `review` skill is the human-in-the-loop gate for drafted wiki pages. Drafts land in `vault/_proposed/` (mirroring their eventual wiki path); nothing reaches the wiki until a human approves. It handles all drafted content — local-model drafts, durable-memory write-backs, local-ingest stubs — through one `_proposed/` channel.

## Key Claims

Covers: Review Skill, `_proposed/` Contract, Promotion Gate, Duplicate-Claim Check, P2.4 Canonical Form.

`propose approve` is the only sanctioned promotion path: it moves the file, sets `status: active`, drops `proposed_by`, stamps `updated`, and commits under a git checkpoint. Before presenting a draft, the duplicate-claim helper (`check-duplicate-claims.sh`) runs an advisory WARN comparing normalized `source_quotes` — exact/normalized string equality only, no fuzzy matching. The canonical form normalization: strip YAML quoting, ASCII lowercase, collapse whitespace, trim, remove fixed punctuation class.
