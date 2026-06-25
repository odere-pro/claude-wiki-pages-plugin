---
title: "scripts/declutter-source-outlinks.ts"
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

# scripts/declutter-source-outlinks.ts

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/declutter-source-outlinks.ts

## Summary

Removes cross-cutting out-links from source summaries so sources become leaf provenance nodes that cluster with the topic pages that cite them, forming topic islands instead of a hairball graph. Strips "Entities Mentioned", "Concepts Covered", and "Grounded Pages" sections from `wiki/_sources/*` pages.

## Key Claims

Safety guard: strips a source's out-link sections only when that source already has at least one inbound citation from a non-source page. Uncited sources keep their sections untouched to prevent orphaning. Operates on wiki/_sources/ only. Inbound citation count excludes links from other _sources pages (which are themselves subject to removal). Dry-run by default; `--write` applies changes.

Covers: Source Graph Decoupling, Topic Island Pattern, Out-Link Removal, Provenance Direction
