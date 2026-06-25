---
title: "Search Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "search"]
aliases: ["Search Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Search Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/search/SKILL.md`
- Type: Skill definition for the `search` verb

## Summary

The `search` skill finds wiki pages by keyword with a deterministic, reproducible ranking. It returns a ranked candidate set, not a synthesized answer. Backed by the engine `search` command with three optional candidate filters (--type, --folder, --tag), Tier-2 synonym expansion via `_vocabulary.md`, Porter stemming, and optional graph-expansion via `--graph`.

## Key Claims

Covers: Search Skill, R1 Candidate Filters, R2 Graph Expansion, R3 Retrieval Contract, Tier-2 Recall, Score Object, Synonym Lexicon, Porter Stemmer.

Scoring is fixed: title-phrase > title-term > alias-term > tag-term > body-term > synonym-term > stem-term > graph-edge. `score === sum(matched.points)` is a hard invariant. `--graph` is off by default; when enabled, it walks `sources`, `related`, and `depends_on` predicates up to N=2 hops. Same vault + same query + same lexicon → byte-identical output. `_vocabulary.md` is at the vault root (no `type:` frontmatter required); absent lexicon degrades silently to exact-only behavior.
