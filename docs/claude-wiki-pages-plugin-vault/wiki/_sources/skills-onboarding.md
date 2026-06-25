---
title: "Onboarding Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "onboarding"]
aliases: ["Onboarding Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Onboarding Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/onboarding/SKILL.md`
- Type: Skill definition for the `onboarding` verb

## Summary

The `onboarding` skill guides a first-time user from "just installed" to a working, queryable wiki in five steps: health check → scaffold vault → add first source → ingest → ask a question. Idempotent — probes state first, resumes from wherever the vault already is.

## Key Claims

Covers: Onboarding Skill, Five-Step Guided Tour, Resume-Not-Restart Principle, Plain-Language Principle.

The bundled sample source (`sample-source.md`) is seeded by the scaffold so users can ingest immediately. The closing "what you can do next" map names: ingest more sources via `/claude-wiki-pages:wiki`, query via `/claude-wiki-pages:query`, rollback via `git log`, health check via `/claude-wiki-pages:doctor`, engine API via `/claude-wiki-pages:engine-api`, and optional offline/local-model drafting. The local-model option is never set up unprompted — opt-in only.
