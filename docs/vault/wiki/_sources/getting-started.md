---
title: "Getting Started"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [getting-started, onboarding, quickstart]
aliases: ["Getting Started"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Getting Started

## Summary

Step-by-step CLI quickstart: run Claude Code, install the plugin via marketplace, create a vault with `/claude-wiki-pages:init`, import raw files, run `/claude-wiki-pages:wiki` (the recommended entry), check status, query, and export portable markdown. Power users can call individual specialist agents directly.

## Key Claims

- Plugin is installed via `/plugin marketplace add odere-pro/claude-wiki-pages-plugin` then `/plugin install claude-wiki-pages`.
- Vault creation: `/claude-wiki-pages:init` or `/claude-wiki-pages:init my vault is docs/vault`.
- Raw files are imported with shell copy commands (`!cp`).
- `/claude-wiki-pages:wiki` is the recommended entry: probes vault state and chains the right next step automatically.
- Power users can call individual agents directly: `/claude-wiki-pages:claude-wiki-pages-ingest-agent`, `/claude-wiki-pages:claude-wiki-pages-curator-agent`.
- Status: `/claude-wiki-pages:status`.
- Query: `/claude-wiki-pages:query what does the wiki say about <topic>?`.
- Export: `/claude-wiki-pages:markdown` writes portable markdown (no wikilinks) to `vault/output/<slug>.md`.

## Entities Mentioned

- [[claude-wiki-pages]]

## Concepts Covered

- [[Onboarding]]
- [[Vault Creation]]
- [[Portable Markdown]]
- [[One Advertised Path]]
