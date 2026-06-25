---
title: "ADR-0033: Topic-Local Linking and Island Graph"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-15
date_ingested: 2026-06-25
tags: ["docs", "adr", "graph"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0033: Topic-Local Linking and Island Graph

## Metadata

- File: `raw/repo/docs/adr/ADR-0033-topic-local-linking-and-island-graph.md`
- Status: Superseded by ADR-0036 (linking rule superseded; connectivity metric, island view filter, and ROOT-hub remain in force)

## Summary

Introduces topic-local linking as the authoring rule: wikilinks between visible topic pages must stay within the same top-level topic folder. Cross-topic references written as plain prose. The topic graph view excludes connective scaffolding (_sources/, _synthesis/, index.md, log.md). Superseded by ADR-0036 which is stricter.

## Key Claims

Problem: observed 191 of 217 nodes in one connected blob, ~1000 cross-topic edges, full hairball — two causes: (1) cross-topic association links in related:/depends_on:/etc.; (2) multi-cited sources and index.md/_synthesis/ as graph nodes stitching all islands together. Decision: cross-topic wikilinks demoted to plain prose; disentangle-links.sh applies rule to existing vault (now retired — strict-tree-reduce.sh is sole reducer); graph.json excludes _sources/, _synthesis/, wiki/index.md, wiki/log.md from topic graph view (these remain real pages, just not drawn). Measurability: graph-quality.sh verifies rendered-island structure over filtered node set. Result: 7 islands (28/24/23/18/16/8/7), 0 cross-topic edges, down from 191-node blob. ADR-0033 connectivity metric, island view filter, and ROOT-hub remain in force under ADR-0036.

Covers: Topic-Local Linking, Island Graph, Graph View Filter, ROOT Hub, disentangle-links
