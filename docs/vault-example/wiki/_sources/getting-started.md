---
title: "Getting Started"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Getting Started"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

A reference guide covering everything needed to go from a fresh plugin install to a verified-green vault. Describes prerequisites (Claude Code, the plugin, Obsidian, jq), the scaffold command `/claude-wiki-pages:init`, the health-check command `/claude-wiki-pages:status`, and optional Obsidian setup steps.

## Key Claims

- The `SessionStart` hook fires a preamble reminding the LLM to read `vault/CLAUDE.md` before any wiki operation.
- `/claude-wiki-pages:init` copies `docs/vault-example/` into the project as `vault/` and writes the authoritative schema.
- `/claude-wiki-pages:status` exercises every hook path and prints a green/red report per path.
- Obsidian setup is optional but enables graph view, Dataview, and the Web Clipper.
- `vault/output/` is git-ignored scratch space — no frontmatter, no schema.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[LLM Wiki Pattern]]
- [[Hook-Enforced Guarantees]]
- [[Vault Scaffolding]]
