---
title: "vocabulary.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "vocabulary", "synonyms"]
aliases: ["vocabulary.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# vocabulary.ts Source

## Summary

`src/core/vocabulary.ts` loads the synonym lexicon from `_vocabulary.md` at vault root. `loadLexicon()` parses the frontmatter `groups:` array, then uses union-find to compute the full connected-component closure — so overlapping groups merge transitively regardless of declaration order. `synonymsOf()` returns a sorted list of all synonyms for a term. Absent or unreadable file returns `EMPTY_LEXICON` without throwing. Zero network, zero embeddings, zero ML.

## Key Claims

- `VOCABULARY_FILE = "_vocabulary.md"` — the filename; siblings with `wiki/` at vault root.
- `SynonymLexicon` is `{ expand: ReadonlyMap<string, ReadonlySet<string>> }` — bidirectional.
- Union-find phase: all forms in a group are union-ed; transitive overlaps collapse into one connected component.
- Deterministic root selection: lexicographically smaller root becomes canonical (order-independent).
- The `expand` map maps each form to the OTHER forms in its component (not itself).
- `synonymsOf()` lowercases+trims the term key; returns `[]` when absent.
- Path compression is applied during `find()` for amortized O(1) lookups.
- The lexicon is loaded once per `search()` call; it is NOT cached across calls.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Synonym Lexicon]]
- [[Tier-2 Deterministic Recall]]
- [[Search Scoring Algorithm]]
