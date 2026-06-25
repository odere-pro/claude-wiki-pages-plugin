---
title: "Synthesize Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "synthesize"]
aliases: ["Synthesize Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Synthesize Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/synthesize/SKILL.md`
- Type: Skill definition for the `synthesize` verb

## Summary

The `synthesize` skill writes a single new page under `vault/wiki/_synthesis/` with `type: synthesis` frontmatter. One page per invocation; a multi-topic session becomes several synthesis notes. Every synthesis has at least two pages in scope and at least one source.

## Key Claims

Covers: Synthesize Skill, Synthesis Types, Scope Contract, READY Signal.

The `synthesis_type` field is chosen from five closed values: `comparison`, `theme`, `contradiction`, `gap`, `timeline` — no default, deliberate choice required. `scope:` must have at least two piped-basename wikilink entries (a synthesis of one page is an extended page, not a synthesis). The skill never edits existing synthesis notes; it produces a new one and marks the old one `status: superseded` in a separate invocation. After writing, it reminds the user to run `/claude-wiki-pages:index`.
