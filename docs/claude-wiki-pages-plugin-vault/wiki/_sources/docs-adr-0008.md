---
title: "ADR-0008: Graph Traversal Primitive"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-15
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0008: Graph Traversal Primitive

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-05-15
- **URL:** —

## Summary

ADR-0008 specifies the single graph-traversal primitive (R2 `--graph`) — the one mechanism for link-walking in the wiki. It walks the provenance/association core (`sources`, `related`, `depends_on`) up to N≤2 hops from a search hit. The "one primitive" rule prevents a proliferation of bespoke traversal code.

## Key Claims

Status: Accepted. The R2 primitive is the authoritative graph walk for all consumers: query, analyst, synthesis. It reads its edge set from the predicate domain→range table in `ontology-profile-v1`. It never embeds or uses vector similarity. Depth is bounded at N≤2 to keep traversal predictable. The primitive is implemented in `src/commands/search` and is the only graph-walk the engine exposes.

Covers: Graph Traversal Primitive, R2 Graph Walk, Link-Walk, Ontology Predicates
