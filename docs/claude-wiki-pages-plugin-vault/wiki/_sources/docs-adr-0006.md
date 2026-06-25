---
title: "ADR-0006: Search Score Object"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-12
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0006: Search Score Object

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-05-12
- **URL:** —

## Summary

ADR-0006 defines the `matched{}` score object — the single shared data structure that every search operation returns. The score object carries the hit page, the term matches, a relevance score, and a `next?` field for graph link-walk continuation. This is the "one score object" shared mechanism (Brief §6).

## Key Claims

Status: Accepted. The `matched{}` object is the contract between the engine's retrieval layer and any consumer (skills, agents, analysts). Fields: `page` (wiki path), `terms` (matched tokens), `score` (float), `next?` (JSON-only optional, for R2 graph walk). The object is produced by `src/core/report` and consumed by the query skill and analyst agent. No embeddings appear in or alongside this object — it is a lexical/structural artifact.

Covers: Search Score Object, Matched Object, Retrieval Contract, R2 Graph Walk
