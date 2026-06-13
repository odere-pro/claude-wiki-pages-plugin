---
title: "NO-RAG Principle"
type: concept
aliases: ["NO-RAG Principle", "NO-RAG", "no embeddings", "no-rag", "wiki-native recall"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0007: Wiki-Native Recall]]", "[[ADR-0019: Query Tier]]", "[[Architecture Documentation]]", "[[Glossary]]"]
related: ["[[Wiki-Native Recall]]", "[[Deterministic Engine]]", "[[Query Rules]]", "[[Search Score Object]]"]
contradicts: []
tags: ["concept", "retrieval", "non-negotiable"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# NO-RAG Principle

## Definition

The NO-RAG principle is a non-negotiable constraint (§5): no embeddings on the default retrieval path. Retrieval is wiki pages + wikilinks + frontmatter. Every retrieval operation is deterministic keyword matching, frontmatter parsing, or graph traversal. No vector stores, no similarity scoring.

## Key Principles

- **No vector embeddings:** never on the default path. This is a project non-negotiable, not a design preference.
- **Deterministic keyword search:** title/alias matching, tag matching, body term matching, synonym expansion, Porter-style stemming.
- **Graph link-walk:** following typed wikilinks (`sources`, `related`, `depends_on`) from a seed page to N-hop neighbourhood (N≤2). Not similarity search — graph structure.
- **Runtime answer verification** (ADR-0019): for local-model query answers, each cited quote must be a verbatim substring of the cited page. Exact string containment, never similarity.
- **Rationale:** embeddings require external services, drift silently, and cannot be audited. Deterministic keyword search is reproducible, explainable, and auditable.

## Examples

- A query for "four-layer stack" → matches pages with title/alias containing those terms, then synonym-expanded terms ("plugin layers"), then stemmed forms.
- A graph-walk from [[claude-wiki-pages Plugin]] follows `related` and `depends_on` edges up to 2 hops.

## Related Concepts

- [[Wiki-Native Recall]] — the positive description of deterministic retrieval
- [[Deterministic Engine]] — the engine that enforces NO-RAG in code
- [[Query Rules]] — the structured query workflow for agents
- [[Search Score Object]] — how search scores are assembled and explained
