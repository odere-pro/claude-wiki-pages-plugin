# Research Foundations & Prior Art

This document records the academic work, community conventions, and open standards that the `claude-wiki-pages` plugin implements, is inspired by, or deliberately deviates from. For each entry the relationship is stated precisely: "implements", "inspired by", or "deliberately deviates from". Entries are ordered by relevance to the plugin's core design decisions, not by publication date.

---

## Foundational pattern

**Karpathy, A. (2025). "LLM Wiki — a pattern for using LLMs to synthesize and maintain a personal wiki."**
[gist.github.com/karpathy/442a6bf555914893e9891c11519de94f](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
The plugin **implements** this pattern: raw sources go into `raw/` (immutable), an LLM maintains typed, cited wiki pages under `wiki/`, and every claim traces back to a source. The four-layer stack adds hook enforcement, agent orchestration, and a deterministic engine on top of the pattern's one-layer sketch.

---

## Retrieval

**Lewis, P., Perez, E., Piktus, A., et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." NeurIPS 2020.**
[arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)
The plugin **deliberately deviates** from RAG. Retrieval is deterministic: keyword matching, Porter stemming, synonym expansion from a checked-in lexicon, and graph link-walk — no embeddings, no approximate nearest-neighbour index. This is the NO-RAG stance documented in ADR-0007. The tradeoff is full reproducibility and zero vector-index infrastructure at the cost of semantic fuzzy recall.

**Porter, M. F. (1980). "An algorithm for suffix stripping." Program: Electronic Library and Information Systems, 14(3), 130–137.**
The plugin **implements** the Porter stemmer in the engine's Tier-2 deterministic recall path (`src/`) to reduce query and page tokens to their root form so morphological variants match without embeddings or ML models.

---

## Context methodology

**Interpretable Context Methodology (ICM) — filesystem-as-context-state-machine.**
The plugin **implements** the ICM L0–L4 decomposition as the `engine context --skill <name>` verb. Each layer has a defined scope: L0 = vault schema + vocabulary, L1 = MOC hierarchy, L2 = topic pages, L3 = source summaries, L4 = raw sources. A maintenance skill's `## Context contract` table narrows the layer lists to only the files the skill actually reads. The `scope-guard.sh` PreToolUse hook surfaces out-of-contract reads as advisory warnings for interpretability.

---

## Interoperability

**Google Open Knowledge Format (OKF).**
The plugin **implements** OKF round-trip interop via `engine okf export` and `engine okf import`. The vault schema (`type`, `title`, `description`, `tags`, `sources`, `url`) is a superset of OKF's model. Export renders `wiki/` as a portable markdown bundle (frontmatter stripped, wikilinks rewritten as relative links) plus a flat machine catalog. Import snapshots an external bundle into `vault/raw/okf/<name>/` for normal ingest, mapping OKF frontmatter to the vault's source schema.

---

## Provenance

**W3C PROV Data Model (Lebo, T., Sahoo, S., McGuinness, D., et al., 2013). W3C Recommendation.**
[w3.org/TR/prov-dm](https://www.w3.org/TR/prov-dm/)
The plugin is **inspired by** PROV's entity–activity–agent lineage model. The `sources:` frontmatter field on every wiki page traces the page back through `wiki/_sources/` to an immutable `raw/` file, forming a two-hop provenance chain (page → source summary → raw document). The plugin does not produce RDF or use PROV vocabulary; the lineage is structural markdown, not a triplestore.

---

## Knowledge modelling

**Knowledge graphs and lightweight ontologies (typed predicates, domain→range constraints).**
The plugin is **inspired by** knowledge-graph modelling practice. The `ontology-profile-v1` block in `skills/init/template/CLAUDE.md` defines a closed predicate table with domain and range constraints (e.g. `depends_on` links entity to entity; `sources` links any page to a source). The graph is wikilink-based and lives in plain markdown; it is not an RDF graph and requires no triplestore.

**Maps of Content (Nick Milo, Obsidian PKM community) and Zettelkasten folder-note convention.**
The plugin **implements** the MOC navigation model. `wiki/index.md` is the vault-level MOC; each topic folder has a folder note (`<folder>/<folder>.md`, `type: index`) that is the per-topic MOC. The Zettelkasten single-source-of-fact discipline maps to the plugin's `single-sourcing` authoring rule. Established community terms (`MOC`, `folder note`, `vault`) are used deliberately to activate prior knowledge in LLMs reading the schema.

---

## Graph layout

**Fruchterman, T. M. J. & Reingold, E. M. (1991). "Graph drawing by force-directed placement." Software: Practice and Experience, 21(11), 1129–1164.**
The plugin is **inspired by** force-directed layout as implemented in Obsidian's graph view. The topic-island shaping (ADR-0033) is designed to produce seven visually distinct clusters when Obsidian renders the wiki-only graph. The plugin does not run a layout algorithm; it shapes the link set so Obsidian's built-in force-directed renderer produces the desired island topology.

---

> This document is referenced from [`docs/architecture.md`](./architecture.md) under "Research foundations and prior art".
