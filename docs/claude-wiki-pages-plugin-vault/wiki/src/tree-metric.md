---
title: "Tree Metric"
type: concept
aliases: ["tree-metric", "TreeEdge", "TreeMetric", "Edge Classification"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-tree-metric|src/core/tree-metric.ts — Strict-Tree Edge Classification]]"]
related: []
tags: ["src", "core", "tree-metric", "strict-tree", "graph-quality"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Tree Metric

The ONE strict-tree edge classification (ADR-0036). Classifies every `[[wikilink]]` edge among visible topic pages as a SPINE edge (parent↔child) or NON-SPINE edge. Non-spine edges are further marked cross-tree and transitive-redundant.

## Definition

`core/tree-metric.ts` provides `classifyEdges(wiki)` which walks the vault, extracts all body `[[wikilinks]]` among visible topic pages (excluding scaffolding), and classifies each against the strict-tree rule.

## Key Principles

**`TreeEdge`**: `{ from, to, spine, crossTree, transitiveRedundant }`. A spine edge is a parent↔child edge (in either direction via `parent:/children:` frontmatter). A non-spine edge is everything else among topic pages.

**`TreeMetric`**: aggregated counts — `spineEdgeCount`, `nonSpineEdgeCount`, `crossTreeEdgeCount`.

**Scaffolding excluded**: edges into `_sources`, `_synthesis`, `index`, `log`, `manifest` are NOT counted — provenance and MOC are a different node universe (ADR-0031/0033). The ROOT spine (`index.md` → folder note) falls out automatically since `index.md` is scaffolding.

**Cross-tree**: endpoints in different top-level topic folders. Non-spine only.

**Transitive-redundant**: target is already on the source's topic path (the path from source to ROOT along `parent:` links). Removing such an edge does not reduce connectivity.

**Single classification**: both `scripts/graph-quality.ts` and `scripts/tree-lint.ts` consume this module — no second edge classifier can drift.

**Reuses**: `deriveSpine` (one spine derivation), `resolveLink` (one resolution ladder), `stripCode` (one code-fence stripper). Core dependency rule only.

## Examples

- `parent: "[[agents|Agents]]"` on a page in `wiki/agents/` → spine edge
- `related: ["[[docs|Docs]]"]` on a page in `wiki/agents/` → non-spine, cross-tree
- Sibling link in same topic folder → non-spine, same-tree

## Related Concepts

- Backed by `deriveSpine` for the parent↔child spine definition
- Consumed by `scripts/graph-quality.ts` to compute the tree-topology quality score
- ADR-0036: strict-tree topology requires only spine edges among visible topic pages
