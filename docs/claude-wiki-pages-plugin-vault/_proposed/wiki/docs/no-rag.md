---
title: "NO-RAG"
type: concept
aliases: ["NO-RAG", "no-rag stance", "embedding-free retrieval", "deterministic retrieval"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-research-foundations|Research Foundations and Prior Art]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "retrieval", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# NO-RAG

The deliberate decision to retrieve wiki content through deterministic keyword matching, Porter stemming, synonym expansion, and graph link-walking — never through vector embeddings or approximate nearest-neighbour search.

## Definition

NO-RAG is the plugin's retrieval stance: the abbreviation stands for "No Retrieval-Augmented Generation" in the embedding sense. Where classic RAG systems encode documents as vectors and retrieve by semantic similarity, this plugin retrieves by deterministic text operations that always produce the same result for the same input. The engine `search` command is the implementation: it ranks pages by title-phrase, title-term, tag-term, and body-term hits, then optionally walks the wikilink graph for neighbourhood expansion. No ML inference is involved in the retrieval path.

The stance is an explicit deviation from Lewis et al. (2020) RAG. The motivation is reproducibility, auditability, and zero external dependencies: a deterministic retriever requires no embedding model, no vector index, no approximate search infrastructure, and produces results a human can trace step by step.

## Key Principles

**Determinism.** The same query against the same vault always returns the same ranked set. There is no probabilistic element in the retrieval path. This makes the retriever auditable and its results cacheable.

**Structured text operations only.** Retrieval proceeds through Porter stemming (reducing tokens to root forms), synonym expansion (the checked-in synonym lexicon maps "ML" → "machine learning"), and keyword matching against title, alias, tag, and body fields. Each scoring channel contributes to a per-page score; the `matched{}` JSON field exposes every component.

**Graph link-walk as neighbourhood expansion.** After the initial keyword set is retrieved, the engine optionally follows typed wikilinks (`sources`, `related`, `depends_on`) up to N hops via the graph-traversal primitive (R2 `--graph`). This broadens recall along the vault's own semantic structure without embeddings.

**Candidate filters sharpen precision.** `--type`, `--folder`, and `--tag` arguments restrict the corpus before ranking, letting a caller scope a search to a topic or page class.

**Answer verification for local models.** When a local model composes a cited answer, every citation is verified at runtime: the cited page must exist and each quoted sentence must be a verbatim substring of that page. Similarity checks are never used — exact string containment is the floor.

## Examples

A query for "ingest pipeline" against a vault containing pages tagged `ingest` with titles like "Ingest Pipeline" will match on title-phrase (highest weight), title-term, and tag-term channels. A page body mentioning "ingesting" matches on stemmed body-term (Porter reduces "ingesting" → "ingest"). The `matched{}` field in the JSON output shows all three channels and their point contributions.

A query for "ML" expands via the synonym lexicon to also match pages containing "machine learning" in body or tag — no embedding required, the mapping is a checked-in file.

## Related Concepts

The NO-RAG stance shapes the design of the query verb, the analyst agent's working-set selection, and the answer verification gate for local models. It is grounded in the research-foundations document as a deliberate departure from standard RAG practice, chosen in favour of the deterministic engine contract.
---
