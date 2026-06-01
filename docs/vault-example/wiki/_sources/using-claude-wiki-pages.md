---
title: "Using claude-wiki-pages"
type: source
source_type: manual
source_format: text
url: ""
author: "claude-wiki-pages maintainers"
publisher: "claude-wiki-pages plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "overview"]
aliases: ["Using claude-wiki-pages", "using-claude-wiki-pages"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Using claude-wiki-pages

## Metadata

- **Author:** claude-wiki-pages maintainers
- **Publisher:** claude-wiki-pages plugin
- **Path in raw/:** `index.md`

## Summary

Top-level navigation map for the seven user guides. Frames the plugin as turning an Obsidian vault into a provenance-tracked wiki driven by one command: `/claude-wiki-pages:claude-wiki-pages-ingest-agent`. Enumerates the slash commands and their owning guides, and states the two foundational invariants: `vault/CLAUDE.md` is the authoritative schema, and `vault/raw/` is immutable (enforced by `protect-raw.sh`).

## Key Claims

- The default workflow is a single command (`claude-wiki-pages-ingest-agent`); every other command is setup or diagnostic.
- `vault/CLAUDE.md` wins over anything else when schemas disagree.
- `vault/raw/` is immutable — writes are blocked by a hook, not by convention.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[claude-wiki-pages]]

## Concepts Mentioned

- [[LLM Wiki Pattern]]
- [[Hook-Enforced Guarantees]]
- [[Ingest Pipeline]]
