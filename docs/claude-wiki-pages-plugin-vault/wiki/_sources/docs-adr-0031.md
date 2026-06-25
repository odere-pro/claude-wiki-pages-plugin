---
title: "ADR-0031: Graph Connectivity, Orphans, and Shadows"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-16
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0031: Graph Connectivity, Orphans, and Shadows

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-16
- **URL:** —

## Summary

ADR-0031 defines three graph health concepts: orphan pages (no inbound wikilinks), shadow pages (pages that exist in the filesystem but are not reachable from the root MOC via the spine), and the connected-components metric (Cn) as the objective connectivity test. The doctor (D11) checks for orphans; the curator connects them during self-heal.

## Key Claims

Status: Accepted. Orphan: a page with no inbound wikilink from any other wiki page. Shadow: a page not reachable by following `children`/`child_indexes` from `wiki/index.md`. The connected-components count (Cn) is the objective test — a fully connected tree has Cn=1. The cluster efficiency metric (Ce) is Cn normalized to the number of topic folders. `graph-quality.sh` computes both. Doctor D11 detects orphans; the curator's heal pass connects them by adding missing `children:` entries to the appropriate folder note.

Covers: Graph Connectivity, Orphan Pages, Shadow Pages, Connected Components, graph-quality.sh
