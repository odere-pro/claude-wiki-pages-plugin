---
title: "src/commands/search.ts — Deterministic Search"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "commands", "search", "retrieval"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/commands/search.ts — Deterministic Search

## Metadata

- **Source**: `raw/repo/src/commands/search.ts`
- **Type**: TypeScript implementation

## Summary

Deterministic full-text + frontmatter search over `wiki/`. The retrieval substrate the analyst agent uses before reasoning. Ranks wiki pages by a transparent, reproducible score and returns each hit as a `[[wikilink]]` target so citations resolve. No embeddings, no network — same query over the same vault yields the same ranking (gate-testable).

## Key Claims

- SINGLE RANKER: the one ranker and sole source of the one score object per shared-infra invariant
- Scoring channels: `title-phrase` (10), `title-term` (5), `tag-term` (3), `body-term` (1, capped 5 hits), `synonym-term` (1–2), `stem-term` (1), `graph-edge` (1–2 hop-decayed)
- `MatchComponent`: `channel`, `term`, `hits`, `points` — hard invariant: `score === sum(matched[].points)`
- R1 candidate filters: `--type` (exact frontmatter type), `--folder` (path prefix), `--tag` (exact tag) — applied BEFORE scoring, AND composition
- Tier-2 recall: synonym lexicon (`_vocabulary.md`) + Porter stemmer expand query terms; absent lexicon degrades gracefully
- Synonym/stem channels only fire for (term, field) pair not already scored by exact channel — prevents inflation
- R2 `--graph`: opt-in N≤2 walk from keyword hits as seeds; graph is WEAKEST signal, `graph-edge` last in channel order
- Default path (no `--graph`): zero graph code observable, byte-identical to pre-graph baseline
- Ties break by title lexicographically (total order, no insertion-order nondeterminism)
- Agent path (`--json`): full `SearchReport` with `matched` breakdown; human path: one line per hit
Covers: Search Engine, Scoring Channels, MatchComponent, Synonym Recall, Graph Expansion
