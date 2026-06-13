---
title: "Wiki-Native Recall"
type: concept
aliases: ["Wiki-Native Recall", "wiki-native recall", "deterministic retrieval", "keyword search"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0007: Wiki-Native Recall]]", "[[ADR-0006: One Search Score Object]]", "[[ADR-0008: One Graph-Traversal Primitive]]", "[[Glossary]]"]
related: ["[[NO-RAG Principle]]", "[[Deterministic Engine]]", "[[Graph Traversal Primitive]]", "[[Search Score Object]]"]
tags: ["concept", "retrieval", "search"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Wiki-Native Recall

## Definition

Wiki-native recall is the deterministic, embedding-free retrieval path used by the `claude-wiki-pages` plugin. It combines keyword matching (title, alias, tag, body), synonym expansion, stemming, and graph link-walk into a scored, explainable retrieval pipeline.

## Key Principles

- **Curated synonym lexicon** (`vault/_vocabulary.md`): a checked-in file of term→alias mappings. Distinct from frontmatter `aliases` (page-level); the lexicon is vault-global and governed.
- **Porter-style stemmer:** reduces query and page tokens to root forms deterministically (e.g., "running" → "run"). No ML model.
- **Weight ladder:** direct title/alias match > synonym expansion > stem match.
- **Seven scoring channels** (ADR-0006): title-phrase, title-term, alias-term, tag-term, body-term, synonym-term, stem-term, graph-edge.
- **Score invariant:** `score === sum(matched[].points)`. Fully explainable.
- **Graph link-walk** (ADR-0008): follows `sources`, `related`, `depends_on` edges up to N≤2 hops from a seed page. Hop-decayed scores. One shared `walk()` function in `src/core/graph.ts`.

## Examples

Query "multi-vault confinement" → title-phrase match on [[Multi-Vault Registry]] (high score) → synonym expansion finds [[Firewall]] (medium score) → graph walk from [[Multi-Vault Registry]] via `related` edge finds [[Vault Resolution]] (low score, hop-decayed).

## Related Concepts

- [[NO-RAG Principle]] — the non-negotiable that mandates this approach
- [[Deterministic Engine]] — the Bun CLI that implements wiki-native recall
- [[Graph Traversal Primitive]] — `src/core/graph.ts:walk()` used in graph-link scoring
- [[Search Score Object]] — the `SearchHit.matched[]` breakdown
