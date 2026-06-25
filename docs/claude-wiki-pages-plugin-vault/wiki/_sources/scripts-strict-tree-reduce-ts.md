---
title: "scripts/strict-tree-reduce.ts"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/strict-tree-reduce.ts

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/strict-tree-reduce.ts

## Summary

Bun TypeScript implementation of the strict-tree remediation (ADR-0036). The core reducer called by `strict-tree-reduce.sh`. Reuses engine modules without re-implementing: `deriveSpine` (one spine derivation), `resolveLink/normaliseTarget` (resolution ladder), `demoteInBody/pruneFields/splitFrontmatter` (link-demote core), and `computeTreeMetric` (oversaturation report).

## Key Claims

PRUNE_FIELDS set covers related, depends_on, key_pages, members, scope, contradicts, supersedes — association fields whose non-spine entries fuse the graph. Spine fields (parent/children/child_indexes) and provenance (sources) are never pruned. Tag de-cycle adds `topic/<Y>` to the source page's inline tags array when a cross-tree edge is demoted. Dry-run by default; `--apply` flag writes in place.

Covers: Strict-Tree Topology, Bun Engine Module, Link Demotion Implementation, ADR-0036
