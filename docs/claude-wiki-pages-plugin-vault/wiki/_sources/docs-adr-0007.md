---
title: "ADR-0007: Wiki-Native Recall"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-05
date_ingested: 2026-06-25
tags: ["docs", "adr", "retrieval"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0007: Wiki-Native Recall

## Metadata

- File: `raw/repo/docs/adr/ADR-0007-wiki-native-recall.md`
- Status: Accepted

## Summary

Implements embedding-free recall via three deterministic mechanisms: a curated synonym lexicon (vault/_vocabulary.md), a pure Porter-style stemmer (src/core/stem.ts), and pre-scoring query expansion with a strict weight ladder (direct > synonym > stem). Fixes the zero-overlap miss without violating the NO-RAG non-negotiable.

## Key Claims

Problem: search drops any page that scores zero — "car" never finds "Automobile" because no shared token. Solution cannot be embeddings (hard non-negotiable, Brief §5). Three pieces: (1) curated synonym lexicon in vault/_vocabulary.md (frontmatter YAML, loaded via vocabulary.ts, human-edited, git-versioned, absent file degrades to exact-match); (2) pure deterministic Porter-style stemmer in src/core/stem.ts (no data files, no network, no ML; pure total idempotent function); (3) pre-scoring query expansion — each term fans to: itself (exact), lexicon synonyms, its stem — with strict weight ladder: title direct 5, title synonym 2, title/everything stem 1. Expanded matches on synonym-term and stem-term channels of the score object. Direct > synonym > stem so a synonym hit rescues from zero cliff but never outranks a real keyword hit. gate-13 (tests/gates/gate-13-no-rag.sh) scans retrieval files for embedding/vector/HTTP/similarity imports — fail-closed CI invariant with --self-test.

Covers: NO-RAG Stance, Wiki-Native Recall, Synonym Lexicon, Porter Stemmer, Query Expansion
