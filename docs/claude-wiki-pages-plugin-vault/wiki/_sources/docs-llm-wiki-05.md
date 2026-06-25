---
title: "LLM Wiki Guide 05 — Export Outputs"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "llm-wiki", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# LLM Wiki Guide 05 — Export Outputs

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

Guide 05 covers exporting wiki content to deliverables. The `vault/output/` directory is user-owned scratch space for compiled reports, ADRs, memos, and exports. The polish agent's markdown export and the OKF round-trip (`engine okf export|import`) are the two export paths. Output files are plain markdown — no frontmatter schema, not validated.

## Key Claims

Export paths: (1) `vault/output/` — plain markdown scratch space, git-ignored, no schema. Write deliverables here (reports, compiled docs, ADR drafts). (2) OKF round-trip (`engine.sh okf export|import`) — the Open Knowledge Format round-trip for interoperability. (3) The polish agent can also produce a markdown export of the wiki for static publishing. Output files may reference wiki pages with `[[wikilinks]]` for Obsidian resolution; Claude does not lint or repair output/ files.

Covers: Vault Output Directory, OKF Round-Trip, Markdown Export, Polish Agent Export
