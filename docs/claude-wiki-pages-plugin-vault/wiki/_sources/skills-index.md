---
title: "Index Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "index"]
aliases: ["Index Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Index Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/index/SKILL.md`
- Type: Skill definition for the `index` verb

## Summary

The `index` skill generates or refreshes the vault MOC at `vault/wiki/index.md` — the top-level catalog of every topic folder and synthesis note. Per-folder folder notes are owned by the ingest workflow, not this skill. The skill does not touch them.

## Key Claims

Covers: Index Skill, Vault MOC Refresh, Ordering Convention, Idempotency.

The skill lists every top-level topic folder under `## Topics` (one line per folder, wikilink to the folder note) and every synthesis note under `## Synthesis` (piped basename target — bare `[[Title]]` does not resolve to a kebab-case filename). Ordering: topics alphabetical by folder name; syntheses chronological by `created:` ascending, ties broken alphabetically. Underscore-prefixed folders are excluded from the topic list. The skill verifies idempotency — if `wiki/index.md` is byte-identical to what would be written, it skips the write but still logs the refresh.
