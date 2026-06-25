---
title: "Search Command"
type: concept
aliases: ["search-command", "search verb", "deterministic search"]
parent: "[[src-commands|Src Commands]]"
path: "src/commands"
sources: ["[[src-commands-search|src/commands/search.ts — Deterministic Search]]"]
related: []
tags: ["src", "commands", "search", "retrieval", "no-rag"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Search Command

Deterministic full-text + frontmatter search over `wiki/`. The retrieval substrate the analyst agent reads before reasoning. No embeddings, no vectors, no network — same query over the same vault yields the same ranking (gate-testable).

## Definition

`commands/search/search.ts` walks `wiki/`, scores each page through a fixed set of channels, and returns ranked `SearchHit` objects. The `--graph` flag optionally expands results along the wikilink graph (still deterministic — no vectors).

## Key Principles

**SINGLE RANKER**: `search.ts` IS the one ranker and the sole source of the one score object (`score + matched{}`) per the shared-infra invariant. No consumer may re-rank or fork a second scoring path.

**Scoring channels** (fixed weights, gate-testable):
- `title-phrase` (10): whole-query substring in title/aliases
- `title-term` (5): per-term title/alias hit
- `tag-term` (3): per-term tag hit
- `body-term` (1, capped 5 hits): per-term body occurrences
- `synonym-term` (1–2): via `_vocabulary.md` lexicon (Tier-2 recall)
- `stem-term` (1): via Porter stemmer (Tier-2 recall)
- `graph-edge` (1–2 hop-decayed): via graph walk (R2, opt-in)

**`matched{}` score object (R4)**: each hit carries `matched: MatchComponent[]` — `{ channel, term, hits, points }`. Hard invariant: `score === sum(matched[].points)`. Every `score +=` paired with a `matched.push`. JSON-only; human renderer never prints it.

**R1 candidate filters**: `--type`, `--folder`, `--tag` — applied BEFORE scoring (AND composition). Unknown `--type` matches no pages.

**Tier-2 recall**: synonym lexicon + Porter stemmer. Synonym/stem channels only fire for (term, field) pairs not already scored by the exact channel — prevents inflation. Absent `_vocabulary.md` degrades gracefully.

**R2 `--graph`**: N≤2 walk from keyword hits as seeds. Graph is the WEAKEST signal. When `--graph` is absent: zero graph code observable, byte-identical to pre-graph baseline.

**Tie-break**: score-desc then title-asc. Total order — no insertion-order nondeterminism.

## Examples

- `claude-wiki-pages search "firewall"` → ranked hits as text
- `claude-wiki-pages search "firewall" --json` → full `SearchReport` with `matched` breakdown
- `claude-wiki-pages search "vault" --type concept --folder src` → filtered to concept pages in `src/`

## Related Concepts

- Analyst agent calls `search` as the retrieval step before reasoning (NO-RAG stance)
- `core/graph.ts` provides the `walk()` function for optional `--graph` expansion
- `core/vocabulary.ts` and `core/stem.ts` back the Tier-2 recall channels
