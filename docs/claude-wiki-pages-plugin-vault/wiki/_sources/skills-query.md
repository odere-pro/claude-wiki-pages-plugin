---
title: "Query Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "query"]
aliases: ["Query Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Query Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/query/SKILL.md`
- Type: Skill definition for the `query` verb

## Summary

The `query` skill answers natural-language questions from the wiki with `[[wikilink]]` citations. Unlike a general-purpose search, every claim in the answer carries a citation and every cited page must resolve. It uses the C1 budget-aware MOC descent algorithm and the R3 agent-vs-human retrieval contract.

## Key Claims

Covers: Query Skill, C1 Budget-Aware MOC Descent, R3 Retrieval Contract, Score Object, Sources Grounding Ledger.

C1 takes a score-ordered prefix of the engine's output under a context budget — it never re-ranks. Channel-aware tie-breaking at the budget boundary prefers `title-phrase` or `title-term` over `body-only`. The agent path gets structured JSON; the human path gets a rendered wikilink list. Every answer ends with a `## Sources` grounding ledger numbered by first-citation order. The skill logs one line to `wiki/log.md` and never mutates any wiki page.
