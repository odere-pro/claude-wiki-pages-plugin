---
title: "Update an Existing Vault"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "workflow"]
aliases: ["Update an Existing Vault", "update-an-existing-vault"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Update an Existing Vault

## Metadata

- **Path in raw/:** `03-update-existing.md`

## Summary

Day-to-day workflow: drop text or image sources into `raw/`, run the pipeline, let the auto-diff against `log.md` pick up the unprocessed files. Explains the entity distribution model (one source rewrites many pages, never duplicates), topic-tree placement, wikilink-only `sources:`, and title-in-aliases invariant. Documents when to edit pages by hand (rare, with discipline) and when to run lint.

## Key Claims

- The pipeline auto-diffs `raw/` against `wiki/log.md` — no argument needed to ingest newly dropped files.
- Ingesting a source that mentions an existing entity appends to that page's `sources:` rather than creating a duplicate.
- Hand-written pages almost always drift from the schema; the hooks catch many mistakes but not topic-tree placement.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]

## Concepts Mentioned

- [[Ingest Pipeline]]
- [[Entity Distribution Model]]
- [[Hook-Enforced Guarantees]]
