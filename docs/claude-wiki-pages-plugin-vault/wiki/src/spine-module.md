---
title: "Spine Module"
type: concept
aliases: ["spine-module", "deriveSpine", "Strict-Tree Spine", "Spine Derivation"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-spine|src/core/spine.ts — Strict-Tree Spine Derivation]]"]
related: []
tags: ["src", "core", "spine", "strict-tree", "graph"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Spine Module

The ONE strict-tree spine derivation (ADR-0036). `deriveSpine(wiki)` walks the vault once and returns the per-page spine shape — including orphans, multi-parent violations, and parent-chain cycles. Backs three downstream consumers with a single authoritative derivation.

## Definition

`core/spine.ts` computes the `parent:` spine of a vault: every page hangs beneath exactly one parent, up an unlimited-depth chain terminating at the ROOT MOC (`wiki/index.md`). The result is the `Spine` object containing one `SpineNode` per page.

## Key Principles

**ROOT terminus**: `ROOT_REL = "index.md"` — the vault MOC. All parent chains must reach this to be counted as attached.

**`SpineNode`**: `rel` (wiki-relative `/`-separated path), `tree` (top-level topic folder or `""`), `parent` (resolved parent or null), `depth` (ROOT = 0; -1 if not attached), `pathToRoot`, `children` (sorted), `special`.

**Special pages**: scaffolding (`_sources`, `_synthesis`, `index`, `log`, `manifest`) are `special: true` — not tree nodes; excluded from orphan detection and parent chain walks.

**Three conformance violations**:
- `orphans`: non-root, non-special pages with no resolvable parent
- `multiParent`: pages whose `parent:` resolves to more than one distinct page
- `cycles`: parent-chain loops — detected via iterative DFS; each weakly-connected loop reported once

**Depth and pathToRoot**: computed by memoised upward walk. Breaks at ROOT or on a detected loop. Depth -1 means not attached (cycle or orphan).

**Single source**: backs graph-quality.ts (tree metric), tree-lint, and strict-tree-reduce.ts. No second spine derivation can drift.

**Reuse**: uses `buildLinkIndex`/`resolveLink` (one resolution ladder) and `deriveTopics`/`SPECIAL_DIRS` from `core/topics.ts`. Core dependency rule strictly followed.

## Examples

- `deriveSpine(wiki)` → `Spine` with `nodes`, `orphans`, `multiParent`, `cycles`, `root`, `index`
- A page with `parent: "[[agents|Agents]]"` resolves via the link-resolver; if the agents folder note exists it becomes the parent
- Cycle example: A → B → A — reported as `cycles: [["A.md", "B.md"]]`

## Related Concepts

- ADR-0036: strict-tree topology
- `tree-metric.ts` consumes the spine to classify edges
- `scripts/strict-tree-reduce.ts` uses the spine to demote non-spine edges
