---
title: "Create a New Vault"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "onboarding"]
aliases: ["Create a New Vault", "create-a-new-vault"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Create a New Vault

## Metadata

- **Path in raw/:** `02-create-new-knowledge-base.md`

## Summary

Covers first-time scaffolding and standing up a second independent vault in a different project. The onboarding wizard writes `vault/CLAUDE.md`, `_templates/`, and the bookkeeping files. Topic folders are created on demand during ingest, not up front. Walks through a first end-to-end source (text and image) and the common first-ingest failures (missing attachments, unsupported PDFs, monochrome Obsidian graph).

## Key Claims

- Two vaults from the same plugin install are fully independent (different `CLAUDE.md`, different `raw/`, different `wiki/` trees).
- Topic folders do not exist until a source introduces the topic.
- PDF ingest is deferred — the user must export to markdown/text first.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[llm-wiki-stack]]

## Concepts Mentioned

- [[Vault Scaffolding]]
- [[Ingest Pipeline]]
