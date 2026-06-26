---
title: "Query Process"
type: concept
aliases: ["query", "query process", "wiki query", "question answering", "MOC descent", "C1 retrieval"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "retrieval", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Query Process

The sequence of steps the analyst agent uses to answer a question from the wiki: keyword search to identify a candidate set, MOC descent to collect the working set, synthesis of a cited answer, and a mandatory `## Sources` section listing every consulted page.

## Definition

The query process is the retrieval-and-answer workflow of the `claude-wiki-pages-analyst-agent`. It runs without embeddings or vector similarity — all retrieval is deterministic (NO-RAG). The process has five stages:

1. **Keyword search** — the engine `search` command runs keyword matching (title-phrase > title-term > tag-term > body-term) with optional synonym expansion and Porter stemming to produce a ranked candidate set. `--type`, `--folder`, and `--tag` filters scope the search corpus.

2. **MOC descent** — starting from the vault MOC (`wiki/index.md`), the analyst descends through folder notes to the pages relevant to the query, collecting them into a working set. The descent is bounded by the context budget; the analyst loads L1 (MOC hierarchy) before L2 (topic pages) to stay within budget.

3. **Working set loading** — the analyst reads the pages in the working set, following `sources:` and `related:` wikilinks (within the context budget) to gather supporting context. This is the ICM L2 and optionally L3 (source summaries) context.

4. **Answer synthesis** — the analyst synthesizes an answer with inline `[[wikilink]]` citations to specific wiki pages. Every factual claim is attributed to the page it came from.

5. **`## Sources` section** — every answer ends with a `## Sources` heading listing each consulted wiki page as a numbered `[[wikilink]]` plus the raw source file paths from that page's `sources:` frontmatter. This is the audit surface for the answer's provenance.

## Key Principles

**The `## Sources` section is mandatory.** An answer without a `## Sources` section is incomplete by definition. If no pages were consulted (e.g. the wiki has no relevant content), the section says so explicitly rather than being omitted.

**Deterministic retrieval.** The search engine uses keyword matching, stemming, and synonym expansion — no embeddings, no approximate nearest-neighbour. The same query against the same vault always returns the same candidate set. This is the NO-RAG stance.

**Context budget bounds the working set.** The analyst loads only as many pages as fit within the context budget. MOC descent provides the ordering: the vault MOC (L1) is always loaded; topic pages (L2) are added until the budget is consumed; source summaries (L3) are loaded only if budget remains and a claim needs provenance verification.

**Inline wikilinks anchor claims.** Each factual claim in the answer body includes a `[[wikilink]]` to the page it came from. This makes the answer's reasoning traceable and gives a reader a direct path from the answer to the underlying wiki pages.

**Challenge mode for decisions.** Before writing an ADR or making a decision, the analyst can be asked to query with a challenge framing: "search for past decisions on similar topics, contradictions in my current understanding, and sources that argue against this approach." This mode surfaces counter-evidence rather than confirming evidence.

**Novel synthesis → `_synthesis/` offer.** If the analyst produces a novel synthesis during a query (a cross-topic comparison or gap analysis not yet in the wiki), it offers to file the answer as a new synthesis note in `wiki/_synthesis/` under the `synthesis` type with `synthesis_type: comparison` or `synthesis_type: gap`.

## Examples

A query "What are the spine edges in the strict-tree topology?" runs keyword search for "spine edges strict tree", scores hits in `wiki/docs/strict-tree-topology.md` and `wiki/docs/parent-spine.md` highest (title-term matches), descends those pages from the vault MOC, synthesizes an answer with inline `[[strict-tree-topology|Strict-Tree Topology]]` and `[[parent-spine|Parent Spine]]` citations, and ends with `## Sources` listing both pages and the `raw/repo/docs/adr/ADR-0036-strict-tree-topology.md` raw source paths.

## Related Concepts

The query process is owned by the `claude-wiki-pages-analyst-agent`. It uses the engine `search` command (candidate retrieval), MOC descent (C1 retrieval), the ICM context layers (L1–L3 loading order), the context budget (working set bound), and the `## Sources` convention (answer audit surface). The synthesis step offers to write to `wiki/_synthesis/` using the synthesis type.
---
