---
title: "ADR-0007: Wiki-Native Recall"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "search", "no-rag"]
aliases: ["ADR-0007: Wiki-Native Recall"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0007: Wiki-Native Recall

## Summary

Establishes the NO-RAG / no-embeddings principle for retrieval. Retrieval is wiki pages + wikilinks + frontmatter. A curated synonym lexicon in `vault/_vocabulary.md` enables synonym expansion. Porter-style stemmer provides morphological matching. Weight ladder: direct > synonym > stem.

## Key Claims

- NO embeddings on the default retrieval path — a non-negotiable (§5).
- A curated synonym lexicon (`vault/_vocabulary.md`) maps query terms to aliases for expansion.
- Porter-style stemming reduces tokens to root forms deterministically.
- Weight ladder: direct title/alias match > synonym expansion > stem match.
- GraphRAG (graph link-walk expansion) is a documented direction for `search --graph`, traversing the existing wikilink graph, not a new index.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Wiki-Native Recall]]
- [[Synonym Lexicon]]
- [[Query Expansion]]
- [[Stemming]]
- [[NO-RAG Principle]]

## Grounded Pages

Wiki pages that cite this source:

- [[Wiki-Native Recall]] — NO-RAG, synonym lexicon, Porter stemming
- [[NO-RAG Principle]] — the core retrieval contract
- [[Plugin Architecture Synthesis]] — determinism theme
