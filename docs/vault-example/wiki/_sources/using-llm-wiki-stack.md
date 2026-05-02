---
title: "Using llm-wiki-stack"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "overview"]
aliases: ["Using llm-wiki-stack", "using-llm-wiki-stack"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Using llm-wiki-stack

## Metadata

- **Author:** llm-wiki-stack maintainers
- **Publisher:** llm-wiki-stack plugin
- **Path in raw/:** `index.md`

## Summary

Top-level navigation map for the seven user guides. Frames the plugin as turning an Obsidian vault into a provenance-tracked wiki driven by one command: `/llm-wiki-stack:llm-wiki-stack-ingest-agent`. Enumerates the slash commands and their owning guides, and states the two foundational invariants: `vault/CLAUDE.md` is the authoritative schema, and `vault/raw/` is immutable (enforced by `protect-raw.sh`).

## Key Claims

- The default workflow is a single command (`llm-wiki-stack-ingest-agent`); every other command is setup or diagnostic.
- `vault/CLAUDE.md` wins over anything else when schemas disagree.
- `vault/raw/` is immutable — writes are blocked by a hook, not by convention.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[llm-wiki-stack]]

## Concepts Mentioned

- [[LLM Wiki Pattern]]
- [[Hook-Enforced Guarantees]]
- [[Ingest Pipeline]]
