---
title: "Update an Existing Vault"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Update an Existing Vault"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

Guide for adding sources to a populated vault. Covers single text source, image source, and batch ingest scenarios. Explains why hand-written pages drift from schema (entity distribution model, topic-tree placement, wikilink-only sources, aliases). Documents the DRY rule for new pages and when to run lint.

## Key Claims

- The pipeline auto-detects unprocessed files by diffing `vault/raw/` against `wiki/log.md` ingest entries.
- Claude's vision reads images natively and extracts on-image text, entities in diagrams, and visible concepts.
- The `validate-attachments.sh` hook blocks writes with missing attachment paths.
- One source rewrites many existing pages (entity distribution model) — ingesting a source that mentions `[[Obsidian]]` appends to the existing page's `sources:` rather than creating a duplicate.
- The `subagent-ingest-gate.sh` hook aborts completion if the wiki is left in a half-written state.
- Hand-written pages should increment `update_count`, update `updated:`, and add new sources as `[[wikilinks]]`.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Ingest Pipeline]]
- [[Entity Distribution Model]]
- [[Hook-Enforced Guarantees]]
- [[Provenance-Tracked Wiki]]
