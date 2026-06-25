---
title: "scripts/graph-quality.sh"
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

# scripts/graph-quality.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/graph-quality.sh

## Summary

Deterministic dangling-wikilink scanner and topic-cluster metric reporter. Thin bash wrapper over `scripts/graph-quality.ts`. Fills the gap left by the Bun engine's `verify`, which checks structural integrity but does not detect dangling links that would appear as empty grey nodes in Obsidian's graph.

## Key Claims

Cluster metric: Cn = pages in the 7 topic clusters / all topic-bearing pages; Ch = resolved edges touching a hub / all resolved edges. Never writes to the vault. Reuses the engine's Obsidian-accurate resolver (`src/core/link-resolver.ts`). Exit 0 always — callers gate on JSON/text output. Consistent with the NO-RAG stance (no network, no embeddings).

Covers: Graph Quality, Dangling Wikilink Detection, Topic-Cluster Metric, NO-RAG Analysis
