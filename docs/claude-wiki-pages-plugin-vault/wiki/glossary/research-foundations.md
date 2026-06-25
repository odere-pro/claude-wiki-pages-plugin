---
title: "Research Foundations"
type: concept
aliases: ["research foundations", "Research Foundations", "prior art"]
parent: "[[glossary|Glossary]]"
path: "glossary"
sources: ["[[docs-research-foundations|Research Foundations and Prior Art]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "research", "foundations"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Research Foundations

The academic work, community conventions, and open standards that the claude-wiki-pages plugin implements, is inspired by, or deliberately deviates from.

## Definition

The plugin is grounded in seven bodies of prior art, each with a precisely stated relationship: "implements", "inspired by", or "deliberately deviates from".

## Key Principles

**Karpathy LLM Wiki pattern (2025) — implements.** The plugin directly implements this pattern: raw sources go into `raw/` (immutable), an LLM maintains typed, cited wiki pages under `wiki/`, every claim traces back to a source. The four-layer stack adds hook enforcement, agent orchestration, and a deterministic engine on top of the pattern's one-layer sketch.

**RAG (Lewis et al., NeurIPS 2020) — deliberately deviates.** The plugin deliberately deviates from retrieval-augmented generation. Retrieval is deterministic: keyword matching, Porter stemming, synonym expansion from a checked-in lexicon, and graph link-walk — no embeddings, no approximate nearest-neighbour index. This is the NO-RAG stance documented in ADR-0007. The tradeoff is full reproducibility and zero vector-index infrastructure at the cost of semantic fuzzy recall.

**Porter stemmer (1980) — implements.** The engine's Tier-2 deterministic recall path (`src/`) uses the Porter stemmer to reduce query and page tokens to their root form so morphological variants match without embeddings.

**ICM L0–L4 decomposition — implements.** The Interpretable Context Methodology is implemented as the `engine context --skill <name>` verb. Each layer has a defined scope: L0 = vault schema + vocabulary, L1 = MOC hierarchy, L2 = topic pages, L3 = source summaries, L4 = raw sources.

**Google OKF (Open Knowledge Format) — implements.** Round-trip interop via `engine okf export` and `engine okf import`. The vault schema is a superset of OKF's model. Export renders `wiki/` as a portable markdown bundle; import snapshots an external bundle into `vault/raw/okf/<name>/` for normal ingest.

**W3C PROV Data Model — inspired by.** The `sources:` frontmatter field on every wiki page traces the page back through `wiki/_sources/` to an immutable `raw/` file, forming a two-hop provenance chain. The plugin does not produce RDF; the lineage is structural markdown, not a triplestore.

**MOC / Zettelkasten — implements.** The Map-of-Content navigation model: `wiki/index.md` is the vault-level MOC; each topic folder has a folder note (`<folder>/<folder>.md`, `type: index`). The Zettelkasten single-source-of-fact discipline maps to the plugin's `single-sourcing` authoring rule. Established community terms are used deliberately to activate LLM priors.

**Force-directed layout (Fruchterman-Reingold 1991) — inspired by.** The topic-island shaping (ADR-0033) is designed to produce visually distinct clusters when Obsidian renders the wiki-only graph. The plugin shapes the link set so Obsidian's built-in force-directed renderer produces the desired island topology.

## Examples

The NO-RAG stance is a CI invariant enforced by gate-13, which scans the retrieval files and fails if any imports an embedding, vector, or similarity library.

## Related Concepts

The NO-RAG stance is further documented in ADR-0007. The OKF interop and ICM context layering are described in `docs/architecture.md`.
