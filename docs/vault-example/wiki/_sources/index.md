---
title: "Using claude-wiki-pages"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Using claude-wiki-pages"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

The top-level orientation document for `claude-wiki-pages`. Maps the full guide set (guides 1–7), presents the slash-command reference table, and states two invariants: `vault/CLAUDE.md` is the schema authority; `vault/raw/` is immutable. The one primary command is `/claude-wiki-pages:claude-wiki-pages-ingest-agent`.

## Key Claims

- The plugin turns an Obsidian vault into a provenance-tracked wiki: drop sources in `vault/raw/`, run one command, the plugin maintains `vault/wiki/`.
- The full guide sequence: install → create vault → add sources → validate/repair → query → dashboard → produce outputs.
- Power-user verbs (`ingest`, `lint`, `fix`, `index`, `obsidian-graph-colors`) are scope-limited alternatives to the full pipeline.
- `vault/CLAUDE.md` is the schema; if it disagrees with any guide, the schema wins.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[LLM Wiki Pattern]]
- [[Provenance-Tracked Wiki]]
- [[Ingest Pipeline]]
- [[Vault Scaffolding]]
