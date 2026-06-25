---
title: "Research Foundations and Prior Art"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "research"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Research Foundations and Prior Art

## Metadata

- File: `raw/repo/docs/research-foundations.md`
- Type: academic reference documentation

## Summary

Records the academic work, community conventions, and open standards that claude-wiki-pages implements, is inspired by, or deliberately deviates from. Each entry states the relationship precisely.

## Key Claims

Karpathy LLM Wiki pattern (2025): implements — raw/ immutable, LLM maintains typed cited wiki/ pages. RAG (Lewis et al., 2020): deliberately deviates — retrieval is deterministic (keyword + Porter stemmer + synonym expansion + graph link-walk), no embeddings, no approximate nearest-neighbour (the NO-RAG stance, ADR-0007). Porter stemmer (1980): implements — in engine Tier-2 deterministic recall path. ICM L0–L4 decomposition: implements — via engine context --skill verb. OKF (Google Open Knowledge Format): implements round-trip via engine okf export/import. W3C PROV: inspired by — sources: field forms two-hop provenance chain, not RDF. Knowledge graphs / typed predicates: inspired by — ontology-profile-v1 defines closed predicate table. MOC / Zettelkasten: implements — vault MOC at wiki/index.md, per-folder folder notes. Force-directed layout (Fruchterman-Reingold 1991): inspired by — link set shaped so Obsidian's renderer produces island topology.

Covers: NO-RAG Stance, Karpathy LLM Wiki Pattern, Porter Stemmer, ICM Context, OKF Interop, PROV Provenance, Knowledge Graph, MOC
