---
title: "LLM Wiki Guide 06 — Check the Dashboard"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "llm-wiki", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# LLM Wiki Guide 06 — Check the Dashboard

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

Guide 06 explains the `wiki/dashboard.md` Dataview dashboard. It shows pending sources, page counts, stale pages, orphan pages, and low-confidence pages. The dashboard uses the Dataview Obsidian plugin; it is not a schema-validated wiki page (no frontmatter required). The graph-quality metrics (dangling link count, Cn, Ce) appear as a separate section.

## Key Claims

Dashboard requires the Dataview Obsidian plugin. Key sections: pending sources (raw files not yet ingested), page counts by type, stale pages (not updated in 30+ days with newer related sources), orphan pages (no inbound links), low-confidence pages (below 0.5). The `graph-quality.sh` metrics (dangling wikilink count, connected-components count Cn, cluster efficiency Ce) are shown as a separate block. Dashboard is regenerable at any time; it is not a truth source, just a view.

Covers: Dataview Dashboard, Pending Sources View, Stale Pages, Orphan Pages, Graph Quality Metrics
