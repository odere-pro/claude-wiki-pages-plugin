---
title: "Ingest Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "ingest"]
aliases: ["Ingest Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Ingest Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/ingest/SKILL.md`
- Type: Skill definition for the `ingest` verb

## Summary

The `ingest` skill processes sources under `vault/raw/` into the wiki. It is the middle third of what the ingest agent does — the agent wraps this skill with a post-ingest lint-fix pass and optional synthesis. The skill defines the authoring voice (house voice from `skills/voice`), the classification checklist, the two-pass alias-aware dedup check, and the wikilink emission rules.

## Key Claims

Covers: Ingest Skill, Classification Checklist, Two-Pass Dedup, Alias-Aware Match, Additive Merge, PDF Ingest, Agent-Session Sources, Hook Enforcement, READY Signal.

Every new page must pass the classification checklist: assign exactly one `type` and, for entities, one `entity_type` from `ontology-profile-v1`. The two-pass dedup runs exact title match first, then alias-aware match — only creates a new page when both passes return no match. Additive merge never drops existing `sources`. The PDF ingest path requires `source_format: pdf`, `attachment_path`, and `extracted_at` in the source note. Agent-session sources from `raw/agent-sessions/` are real raw sources — they go through the same `_proposed/` review gate, never bypassed.
