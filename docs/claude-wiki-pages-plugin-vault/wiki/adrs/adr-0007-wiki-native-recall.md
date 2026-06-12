---
title: "ADR-0007 Wiki-Native Recall"
type: concept
aliases: ["ADR-0007 Wiki-Native Recall", "ADR-0007", "wiki-native recall ADR", "synonym expansion ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0007-wiki-native-recall]]"]
related: ["[[ADR-0006 Search Score Object]]", "[[ADR-0008 Graph Traversal Primitive]]", "[[Canonical Terms]]"]
tags: [adr, retrieval, search, no-rag]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0007: Wiki-Native Recall — Embedding-Free Query Expansion

**Status:** Accepted | **Date:** 2026-06-05

## Problem

The demonstrated recall failure is the zero-overlap miss: `search` drops any page that scores zero, so a query for "car" never finds a page titled "Automobile" — no shared token, no score, invisible. The obvious industry fix (vector embeddings) is **forbidden by an absolute non-negotiable** (NO-RAG, Brief §5, decision #11.1): no vector store, no embeddings, no similarity over latent vectors, ever.

## Decision

Implement recall as a deterministic expansion of the query term set that runs strictly before the existing scoring loop. Three pieces:

1. **A curated synonym lexicon — `vault/_vocabulary.md`** — a checked-in, human-edited, git-versioned Data-layer file. Its frontmatter carries synonym groups; the engine loads it via `src/core/vocabulary.ts`. Each group is an unordered equivalence class of surface forms. An absent file degrades to exact-match (empty lexicon), never an error.

2. **A pure deterministic stemmer — `src/core/stem.ts`** — a fixed Porter-style algorithm. Applied symmetrically to query terms and page tokens. Same input → same output, forever.

3. **Pre-scoring query expansion with a strict weight ladder** — direct > synonym > stem on any field (title direct `5`, title synonym `2`, title/everything stem `1`). Expanded matches are emitted on the `synonym-term` and `stem-term` channels of the ADR-0006 score object. Expansion is de-duplicated by highest-precedence origin.

The whole path is enforced by **gate-13** (`tests/gates/gate-13-no-rag.sh`): fails if retrieval files import an embedding/vector/HTTP/similarity library. Has `--self-test` to ensure the gate cannot silently regress to fail-open.

## Key Alternatives Rejected

- **Any vector/embedding/similarity ranker** — violates the absolute NO-embeddings non-negotiable.
- **Equal weight for synonym/stem and direct matches** — synonym hits would outrank exact title hits.
- **Fold synonyms into each page's `aliases` (only)** — `aliases` are the page-side advertisement; the lexicon is the query-side expansion. Two ends of one handshake, kept in their single home.
