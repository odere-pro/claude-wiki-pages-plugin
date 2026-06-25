---
title: "NO-RAG Stance"
type: concept
aliases: ["NO-RAG stance", "NO-RAG", "no-rag", "embedding-free retrieval"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[docs-research-foundations|Research Foundations and Prior Art]]", "[[docs-adr-0007|ADR-0007: Wiki-Native Recall]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "retrieval", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# NO-RAG Stance

The absolute non-negotiable that the plugin never uses embeddings, vector stores, or approximate nearest-neighbour similarity for retrieval — enforced as a CI gate.

## Definition

The NO-RAG stance (ADR-0007) forbids any vector store, embeddings, or similarity over latent vectors, ever. Retrieval is solved the wiki-native way: deterministic expansion of query term sets before scoring, using lookup tables and fixed algorithms.

## Key Principles

**Why no RAG.** Full reproducibility and zero vector-index infrastructure at the cost of semantic fuzzy recall. Same query + same vault + same lexicon → byte-identical hits and breakdown across every run.

**Three deterministic mechanisms:**

1. **Curated synonym lexicon (`vault/_vocabulary.md`).** A checked-in, human-edited, git-versioned file in the vault. Frontmatter carries synonym groups (concept → variants). Loaded via `src/core/vocabulary.ts`. Each group is an unordered equivalence class; querying any member expands to the whole class. Absent file degrades to exact-match (never an error).

2. **Pure deterministic Porter-style stemmer (`src/core/stem.ts`).** A fixed suffix-rewrite algorithm — no data files, no network, no ML. Applied symmetrically to query terms and page tokens so morphological variants match. Pure, total, idempotent function: same input → same output, forever.

3. **Pre-scoring query expansion with strict weight ladder.** Each query term fans out to: itself (exact), lexicon synonyms, its stem. Score weights: title direct 5, title synonym 2, title/everything stem 1 (direct > synonym > stem). A synonym hit rescues a page from the zero-score cliff without outranking a real keyword hit.

**Gate-13 CI enforcement.** `tests/gates/gate-13-no-rag.sh` scans the retrieval files (`search.ts`, `vocabulary.ts`, `stem.ts`, `graph.ts`) and fails if any imports an embedding/vector/HTTP/similarity library or calls a forbidden token on the path. Includes a `--self-test` that plants a forbidden token and asserts the gate catches it — it can never silently regress to fail-open.

## Examples

A query for "car" now finds a page titled "Automobile" via the synonym lexicon at a lower weight, with a `synonym-term` match component spelling out the reason. A query for "running" finds pages with the token "run" via the stemmer channel.

## Related Concepts

The NO-RAG stance is the absolute §5 non-negotiable. ADR-0007 is the full decision record. The graph link-walk (ADR-0008) extends recall to N-hop neighborhoods without embeddings.
