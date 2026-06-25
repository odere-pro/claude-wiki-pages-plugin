---
title: "src/core/tree-metric.ts — Strict-Tree Edge Classification"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "tree-metric", "strict-tree"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/tree-metric.ts — Strict-Tree Edge Classification

## Metadata

- **Source**: `raw/repo/src/core/tree-metric.ts`
- **Type**: TypeScript implementation

## Summary

The ONE strict-tree edge classification (ADR-0036). Given a vault's `wiki/`, classifies every `[[wikilink]]` edge among visible topic pages against the strict-tree rule: a SPINE edge (parent↔child) or a NON-SPINE edge. Non-spine edges are further marked cross-tree and transitive-redundant. Consumed by graph-quality.ts and tree-lint.ts — no second edge classifier can drift.

## Key Claims

- `TreeEdge`: `from`, `to`, `spine` (parent↔child), `crossTree` (different top-level topics), `transitiveRedundant` (target already on source's topic path)
- `TreeMetric`: `spineEdgeCount`, `nonSpineEdgeCount`, `crossTreeEdgeCount` + additional counts
- Edges into scaffolding not counted — provenance and MOC are a different node universe (ADR-0031/0033)
- ROOT spine (`index.md` → folder note) excluded by construction since `index.md` is scaffolding
- Reuses `deriveSpine` (one spine derivation), `resolveLink` (one resolution ladder), and `stripCode` (one code-fence stripper)
- Both `scripts/graph-quality.ts` and `scripts/tree-lint.ts` consume this module — no drift possible
Covers: Tree Edge Classification, TreeMetric, Spine vs Non-Spine, Cross-Tree Edges
