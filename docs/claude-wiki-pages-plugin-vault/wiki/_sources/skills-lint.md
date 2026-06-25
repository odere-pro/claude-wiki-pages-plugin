---
title: "Lint Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "lint"]
aliases: ["Lint Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Lint Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/lint/SKILL.md`
- Type: Skill definition for the `lint` verb

## Summary

The `lint` skill audits `vault/wiki/` for structural and provenance drift. It is read-only — repairs belong to `/claude-wiki-pages:fix`. It checks for errors (dangling wikilinks, missing frontmatter, plain-string sources, missing parent/path, MOC missing members), warnings (contradictions, orphan pages, stale pages), and info items (low confidence, missing pages).

## Key Claims

Covers: Lint Skill, Lint Rules, S1 Ontology Check, S2 Structural Check, S3 Vocabulary Check, S4 Source-Relative Staleness, Stale-Memory Flagging.

Three opt-in WARN checks run separately: S1 predicate domain→range conformance (`lint-ontology.sh`), S2 template-skeleton conformance and no-raw-HTML (`lint-structural.sh`), S3 controlled-vocabulary freshness (`lint-vocabulary.sh`). Two distinct staleness mechanisms: S4 source-relative staleness (WARN, compares `updated:` date of cited source vs. wiki page) and 30-day calendar staleness (Info). Agent-session memories decay via these same mechanisms — no separate memory-specific system.
