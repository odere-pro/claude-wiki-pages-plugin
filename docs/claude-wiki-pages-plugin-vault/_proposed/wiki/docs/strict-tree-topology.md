---
title: "Strict-Tree Topology"
type: concept
aliases: ["strict tree", "strict-tree topology", "strict-tree rule", "ADR-0036 topology"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-adr-0036|ADR-0036]]", "[[docs-adr-0033|ADR-0033]]"]
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

# Strict-Tree Topology

The graph shape where the only wikilink edges among visible topic pages are the parent-child spine edges and the single ROOT-to-folder-note connector, with every other reference expressed as plain prose or nested tags.

## Definition

Strict-tree topology is the target graph structure that ADR-0036 defines as the successor to the topic-local linking rule of ADR-0033. In the strict tree, the wikilink graph drawn by Obsidian's topic graph view is a literal tree: each page connects upward to its folder note via `parent:`, each folder note connects downward to its children via `children:` and `child_indexes:`, and the vault MOC (`wiki/index.md`) connects to each top-level folder note. No other edges exist among visible topic pages.

The problem the strict tree solves: even after ADR-0033 restricted wikilinks to within a topic, the within-topic subgraph still became a dense blob because intra-topic non-spine edges (siblings linking siblings, nodes linking non-adjacent ancestors) produced hairballs, transitive-redundant edges multiplied paths, and associative fields (`related:`, `depends_on:`) added further fan-out.

The four mechanisms that re-fused the graph after ADR-0033:
1. Intra-topic non-spine edges between siblings.
2. Transitive-redundant edges (A→C where C is already on A's spine path).
3. Oversaturated nodes with tens of outbound links.
4. Association fields (`related`, `depends_on`, `key_pages`, `members`, `scope`, `contradicts`, `supersedes`) within a topic.

The strict-tree rule resolves all four by permitting only spine edges.

## Key Principles

**Only spine edges draw in the graph.** A spine edge is a `parent:` link (page → folder note), a `children:` or `child_indexes:` link (folder note → children), or the ROOT hub's link to a top-level folder note. These are the only wikilinks that produce visible edges in the topic graph view.

**Associative fields carry no graph edges.** The fields `related:`, `depends_on:`, `key_pages:`, `members:`, `scope:`, `contradicts:`, and `supersedes:` are demoted: they do not produce wikilink edges among visible pages. Relationships formerly expressed in these fields are written as plain prose (the page title as text, not `[[wikilink]]`) or as nested tags.

**Tag de-cycling replaces cross-tree edges.** When a `[[wikilink]]` A→B crosses two different topic trees, the reducer removes the wikilink and adds the tag `topic/<B-tree>` to page A. The relationship stays discoverable in the tag view and color groups without producing a graph edge.

**Transitive-redundant edges are auto-demoted.** A non-spine edge A→C where C is already on A's topic path (reachable through the spine) is provably redundant and is automatically removed by `scripts/strict-tree-reduce.sh`.

**`sources:` and the spine are exempt.** The provenance field `sources:` pointing into `_sources/` is never demoted; those edges connect wiki pages to source notes, which the graph view already excludes. The spine fields `parent:`, `children:`, `child_indexes:` are also exempt.

## Examples

Before strict-tree-reduce runs, a concept page might carry `related: ["[[sibling-concept|Sibling Concept]]"]` linking to another page in the same topic. After reduction, that wikilink is removed, and the body of the concept page instead reads "See also Sibling Concept" as plain text. The relationship is preserved for a human reader; the graph draws only the spine.

A page in the `agents` topic that previously linked to a page in the `architecture` topic gets the wikilink demoted and receives the tag `topic/architecture` instead.

## Related Concepts

Strict-tree topology is implemented by `scripts/strict-tree-reduce.sh` (the reducer) and measured by `scripts/graph-quality.sh` and `scripts/tree-lint.sh`. It supersedes the topic-local linking rule of ADR-0033 for the within-topic edge constraint, while retaining ADR-0033's connectivity metric, island view filter, and ROOT hub. Related concepts include the parent spine, folder note, tag de-cycling, transitive-redundant edge, and oversaturation.
---
