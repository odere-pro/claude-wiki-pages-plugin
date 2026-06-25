---
title: "Topic Island"
type: concept
aliases: ["topic island", "island graph", "island topology", "topic cluster"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-adr-0033|ADR-0033]]", "[[docs-adr-0036|ADR-0036]]"]
related: []
tags: ["docs", "graph", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Topic Island

A top-level topic cluster rendered as a disconnected subgraph in Obsidian's graph view, separated from other topics by the absence of cross-topic wikilink edges.

## Definition

A topic island is the visual and structural unit produced by the strict-tree topology rules: each top-level topic folder becomes a self-contained tree in the Obsidian graph view, connected internally by spine edges but with no wikilink edges crossing to other topics. From the graph's perspective, each topic is a disconnected island — hence the name.

The island topology is an intentional design goal. When topics are connected through shared sources or cross-topic association links, the graph collapses into a single large connected blob where topical structure is illegible. The island topology separates concerns visually and enforces that the topic tree is the primary organizing principle.

The islands are made visible by two complementary exclusion mechanisms:

1. **Excluded from Obsidian's index entirely** — `raw/`, `_templates/`, `_proposed/`, `_inbox/`, `output/`, `CLAUDE.md`, and `wiki/log.md` never appear in the graph or search.
2. **Excluded from the graph view only** — `wiki/_sources/`, `wiki/_synthesis/`, and `wiki/index.md` remain searchable pages but are filtered out of the drawn graph. This prevents the fusion that would result from multiple topic pages citing the same source note (which would connect two islands through a shared source node).

The ROOT hub (`wiki/index.md`) is un-hidden from the island filter and given a distinct color, so every topic island visibly hangs off one findable root in the graph view.

## Key Principles

**Cross-topic references are prose, not edges.** A page that needs to reference a concept in another topic writes the concept name as plain text or uses a nested `topic/<other-tree>` tag. It does not carry a `[[wikilink]]` to the other page. This is the rule that keeps the islands disconnected in the graph.

**Sources and synthesis are excluded from the topic graph view.** The source notes and synthesis notes that connect multiple topics are real wiki pages and remain searchable, but `graph.json` filters them out of the topic graph view. Connectivity among sources is provenance; it must not be confused with topic proximity.

**Connected components measure isolation.** The objective health target is one connected component per topic plus the ROOT hub connection — zero cross-topic edges and zero floating orphan nodes. `scripts/graph-quality.sh` computes connected components over the node universe and reports the component count.

**Color groups per island.** Each top-level topic folder gets a distinct color group in Obsidian's graph color configuration (`path:wiki/<topic>`). This makes each island visually distinctive and allows a reader to identify which topic a node belongs to at a glance.

## Examples

After a clean strict-tree-reduce pass on a vault with seven topics, `graph-quality.sh` reports seven topic islands plus the ROOT hub — eight components total — and zero cross-topic edges. Each island is a tree rooted at its folder note, with the ROOT hub connecting to all seven folder notes.

The source note `wiki/_sources/docs-architecture.md` is cited by pages in multiple topics. Because source notes are excluded from the topic graph view, this citation does not draw an edge between those topics; each topic remains an island.

## Related Concepts

Topic islands are produced by the strict-tree topology rule and the island view filter (ADR-0033/0036). They are measured by `graph-quality.sh` (connected components, cross-topic edge count). The ROOT hub is the one node that anchors all islands. Color groups make islands visually distinct. Cross-topic references are written as prose or `topic/<tree>` tags via tag de-cycling.
---
