---
title: "src/core/spine.ts — Strict-Tree Spine Derivation"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "spine", "strict-tree"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/spine.ts — Strict-Tree Spine Derivation

## Metadata

- **Source**: `raw/repo/src/core/spine.ts`
- **Type**: TypeScript implementation

## Summary

The ONE strict-tree spine derivation (ADR-0036). `deriveSpine(wiki)` walks the vault once, resolves each page's `parent:` wikilink with the engine's own resolver, and returns the per-page spine shape plus three conformance violations: `orphans`, `multiParent`, and `cycles`. Backs graph-quality tree metric, tree-lint, and strict-tree reducer.

## Key Claims

- `deriveSpine(wiki)`: produces `Spine` with `nodes` (per-page `SpineNode`), `orphans`, `multiParent`, `cycles`, `root`, `index`
- `SpineNode`: `rel`, `tree`, `parent`, `depth`, `pathToRoot`, `children`, `special`
- ROOT terminus: `wiki/index.md` (ROOT_REL = `"index.md"`)
- Scaffolding pages (`_sources`, `_synthesis`, `index`, `log`, `manifest`) are `special: true` — not tree nodes
- Orphans: non-root, non-special pages with no resolvable parent
- Multi-parent: pages whose `parent:` resolves to more than one distinct page
- Cycles: detected via iterative DFS with on-stack tracking; each weakly-connected loop reported once
- Depth: ROOT = 0; `-1` if not attached to ROOT
- Reuses `buildLinkIndex`/`resolveLink` (the one resolution ladder) and `deriveTopics` — no second spine derivation can drift
- Single module backs three downstream consumers: graph-quality.ts, tree-lint, strict-tree-reduce.ts
Covers: Strict-Tree Spine, deriveSpine, SpineNode, Orphan Detection, Cycle Detection
