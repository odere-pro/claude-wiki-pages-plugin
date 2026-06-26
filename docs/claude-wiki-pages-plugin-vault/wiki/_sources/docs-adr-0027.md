---
title: "ADR-0027: Fill-Gaps and Graph Quality"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-15
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0027: Fill-Gaps and Graph Quality

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-15
- **URL:** —

## Summary

ADR-0027 adds the `/claude-wiki-pages:fill-gaps` command and the `graph-quality.sh` detector. Fill-gaps identifies wiki pages with thin content, broken wikilinks, or missing provenance and queues them for enrichment. The graph-quality detector measures connectivity metrics (dangling links, orphans, cluster count) and reports them as dashboard metrics.

## Key Claims

Status: Accepted. The fill-gaps skill identifies gap types: thin-section (H2 with < 2 sentences), missing-sources (0 source citations), and dangling-wikilinks. The `graph-quality.sh` script measures: dangling wikilink count, orphan page count, connected-components count (Cn), and cluster efficiency (Ce). PR #34 delivered the fill-gaps capability; graph-quality went from 90 dangling links to 0, 7-topic clusters with Cn=Ce=1.0.

Covers: Fill-Gaps, Graph Quality, Dangling Wikilinks, Orphan Pages, graph-quality.sh
