---
title: "ADR-0007: Wiki-Native Recall"
type: entity
entity_type: standard
aliases: ["ADR-0007", "adr-0007", "wiki-native recall ADR", "NO-RAG ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0007|ADR-0007: Wiki-Native Recall]]"]
related: []
tags: ["docs", "adrs", "retrieval"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0007: Wiki-Native Recall

The decision to forbid all vector stores, embeddings, and approximate-similarity retrieval, and to implement recall using three deterministic mechanisms instead.

## Overview

ADR-0007 is the formal commitment to the NO-RAG stance — an absolute non-negotiable enforced by CI gate-13. Retrieval is solved entirely with deterministic lookup: no embedding model, no vector index, no approximate-nearest-neighbour call.

## Key Facts

**Status:** Accepted

**Problem being solved:** RAG introduces a non-deterministic black box that makes recall irreproducible (same query may return different results on reruns), requires external infrastructure (a vector DB or embedding API), and carries semantic drift risk (cosine similarity does not respect schema-level type constraints). The plugin's value proposition is reproducibility; RAG undermines it.

**Decision:** Three deterministic retrieval mechanisms, applied in order:

1. **Synonym lexicon (`vault/_vocabulary.md`).** A checked-in, git-versioned YAML file. Each group is an unordered equivalence class. Querying any term in the group expands to all members. Absent file = degrade to exact-match (never an error).

2. **Porter-style stemmer (`src/core/stem.ts`).** A pure, total, idempotent function — same input always produces same output. Applied symmetrically to query terms and page tokens. No data files, no network, no ML.

3. **Pre-scoring query expansion.** Each query term fans to itself (exact), lexicon synonyms, and its stem. Score weights: title direct 5, title synonym 2, stem 1. Direct hits outrank synonyms outrank stems — a synonym hit rescues a page from zero without outranking a real keyword.

**CI enforcement.** Gate-13 (`tests/gates/gate-13-no-rag.sh`) scans `search.ts`, `vocabulary.ts`, `stem.ts`, `graph.ts` for forbidden imports/tokens. Self-tests: plants a forbidden token, asserts the gate catches it.

**Trade-off consciously accepted:** Semantic fuzzy recall (finding "automobile" for "car" without a lexicon entry) is sacrificed. Any gap is addressed by adding a synonym group to `_vocabulary.md`, not by enabling embeddings.

## Related

The NO-RAG stance concept page describes the three mechanisms in detail. Gate-13 is the CI enforcement artifact. ADR-0008 (graph link-walk) extends recall to N-hop neighborhoods without embeddings.
