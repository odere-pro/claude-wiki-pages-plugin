---
title: "Getting Started"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "onboarding"]
aliases: ["Getting Started", "getting-started"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Getting Started

## Metadata

- **Path in raw/:** `01-getting-started.md`

## Summary

Reference guide covering prerequisites (Claude Code, Obsidian 1.5+, jq), plugin install (remote marketplace or local path), session-start hook preamble confirmation, vault scaffolding via `/llm-wiki-stack:llm-wiki`, and the health check via `/llm-wiki-stack:llm-wiki-status`. Also lists the optional Obsidian setup (Dataview, Templater, Web Clipper) and graph coloring.

## Key Claims

- `SessionStart` preamble firing in a fresh session proves the hook bus is working.
- The health check exercises every hook path (frontmatter validation, wikilink enforcement, raw/ immutability, verify-ingest) and reports green/red per path.
- `vault/output/` is outside the schema — plain markdown, git-ignored, not linted.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[Dataview]]
- [[llm-wiki-stack]]

## Concepts Mentioned

- [[Hook-Enforced Guarantees]]
- [[LLM Wiki Pattern]]
