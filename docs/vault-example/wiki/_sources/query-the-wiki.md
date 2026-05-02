---
title: "Query the Wiki"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "query"]
aliases: ["Query the Wiki", "query-the-wiki"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Query the Wiki

## Metadata

- **Path in raw/:** `07-query-the-wiki.md`

## Summary

Query workflow: `llm-wiki-query` for single questions with citations, `llm-wiki-stack-analyst-agent` for cross-topic analysis, challenge mode, and document compilation. The query skill reads `wiki/index.md`, traverses topic MOCs, synthesizes an answer with `[[wikilinks]]` citations, and appends the question to `wiki/log.md`. Covers citation auditing (check `sources:`, `confidence:`, `updated:` on every cited page), gap handling, and saving high-value answers as synthesis notes.

## Key Claims

- Every answer claim ends in a `[[wikilink]]` — this is how provenance is audited.
- When the wiki lacks an answer, the skill says so; it does not invent one.
- A documented gap (synthesis note with `synthesis_type: gap`) is useful output even when no answer exists.

## Entities Mentioned

- [[Obsidian]]
- [[Dataview]]

## Concepts Mentioned

- [[Query Workflow]]
