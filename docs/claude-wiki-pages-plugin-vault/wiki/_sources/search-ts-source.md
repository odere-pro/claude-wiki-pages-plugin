---
title: "search.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "search", "recall"]
aliases: ["search.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# search.ts Source

## Summary

`src/commands/search/search.ts` implements the deterministic full-text + frontmatter search over `wiki/`. It uses transparent, fixed scoring weights across eight channels: exact (title-phrase, title-term, alias-term, tag-term, body-term) and Tier-2 (synonym-term, stem-term, graph-edge). R1 candidate filters (type, folder, tag) prune before scoring. R2 graph expansion (opt-in via `--graph`) calls `walk()` from graph.ts. The synonym lexicon and Porter stemmer are loaded once per call. Same query, same vault, same ranking — gate-testable.

## Key Claims

- Scoring weights: `W_PHRASE_TITLE=10`, `W_TERM_TITLE=5`, `W_TERM_TAG=3`, `W_TERM_BODY=1` (capped at `BODY_HITS_CAP=5`).
- Synonym channel weights: title=2, tag=1, body=1 (lower than exact).
- Stem channel weights: title=1, tag=1, body=1 (lowest).
- R4 invariant: `score === sum(matched[].points)` always holds.
- Synonym deduplication: a `(source term, field)` pair is only emitted once even if multiple synonyms match.
- Stem channel uses tokenized set equality (NOT includes()) to avoid false substring matches.
- R2 graph walk is off by default — `--graph` flag required; zero graph code runs on the default path.
- R1 filters are AND-composed and prune the candidate set before any scoring.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Search Scoring Algorithm]]
- [[Tier-2 Deterministic Recall]]
- [[Graph Walk Algorithm]]
- [[Synonym Lexicon]]
- [[Porter Stemmer]]
- [[Wiki-Native Recall]]
