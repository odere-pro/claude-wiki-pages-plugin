---
title: "Strict Tree Topology"
type: concept
aliases: ["strict tree topology", "Strict Tree Topology", "strict tree", "spine edges"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[docs-adr-0036|ADR-0036: Strict-Tree Topology]]", "[[docs-adr-0033|ADR-0033: Topic-Local Linking and Island Graph]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "graph", "topology"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Strict Tree Topology

The graph authoring rule (ADR-0036) where the ONLY wikilink edges among visible topic pages are spine edges (parent↔child) plus the single ROOT→folder-note connector; all other references become plain prose or tags.

## Definition

Strict-tree is the stricter successor to topic-local linking (ADR-0033). Among visible topic pages, only two kinds of edges are drawn: spine edges (a page's `parent:` to its folder note, and a folder note's `children:`/`child_indexes:` to its own pages) and the ROOT spine (`wiki/index.md` → each top-level folder note). Every other reference is plain prose or a nested tag.

## Key Principles

**Why strict-tree.** ADR-0033 (topic-local) collapsed the cross-topic hairball into per-topic islands, but within each topic the same problem recurred: topic-local still permits every intra-topic non-spine edge. Four mechanisms re-fuse a topic into a dense blob: (1) intra-topic non-spine edges (siblings linking siblings); (2) transitive-redundant edges (A→C where C is already on A's spine path); (3) oversaturated nodes (hub accreting tens of outbound links); (4) `related:`/associative fields carrying edges within a topic.

**The rule.** Keep a link iff it is a parent↔child spine edge or the ROOT→folder-note spine. Demote everything else. Association fields (`related`, `depends_on`, `key_pages`, `members`, `scope`, `contradicts`, `supersedes`) carry NO graph edges among visible pages — express the relationship as a nested tag instead.

**Exempt from demotion:** `parent:`/`children:`/`child_indexes:` (spine) and `sources:` → `wiki/_sources/**` (provenance).

**Tag de-cycling.** A demoted cross-tree edge A(tree X)→B(tree Y) becomes the nested tag `topic/<Y>` on A. The relationship stays discoverable in the tag pane without drawing an edge.

**Remediation.** `scripts/strict-tree-reduce.sh --apply` (dry-run by default): demotes non-spine body wikilinks to plain text, prunes non-spine entries from association frontmatter fields, records a `topic/<tree>` tag for each demoted cross-tree edge. Never touches `parent`/`sources`/`children`, never creates dangling links.

**Metrics.** `scripts/graph-quality.sh` measures: connected components (Cn), edge count (Ce), transitive-redundant edge count, oversaturated nodes. `scripts/tree-lint.sh` reads the computed spine from `src/core/spine.ts:deriveSpine`. The target state: one connected component per top-level topic, zero cross-topic edges.

**ADR-0033 remains in force.** The connectivity metric, island view filter (`.obsidian/graph.json` excludes `_sources/`, `_synthesis/`, `index.md`, `log.md`), and ROOT hub are all inherited from ADR-0033. Strict-tree only supersedes the linking rule.

## Examples

A page `pattern-a.md` in the `docs` topic wants to reference `concept-b.md` in the `skills` topic. Under strict tree: write "Concept B" as plain prose, add `topic/skills` as a tag on `pattern-a.md`. Do not write `[[concept-b|Concept B]]`.

## Related Concepts

Strict-tree topology is the graph shape enforced by the polish agent and the curator agent. The remediation script `strict-tree-reduce.sh` implements the reduction. The graph connectivity metric is documented in ADR-0031.
