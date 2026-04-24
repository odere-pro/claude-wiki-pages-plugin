---
title: "Obsidian"
type: entity
entity_type: product
aliases: ["Obsidian", "obsidian"]
parent: "[[Tools — Index]]"
path: "tools"
sources:
  - "[[Using llm-wiki-stack]]"
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
  - "[[Check the Dashboard]]"
  - "[[Query the Wiki]]"
related: ["[[Dataview]]", "[[Claude Code]]", "[[LLM Wiki Pattern]]"]
tags: ["tool", "markdown-editor"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.9
---

# Obsidian

## Overview

Local-first markdown editor that treats a folder as a vault. The target environment for reading and navigating the wiki maintained by `llm-wiki-stack`. Wikilinks, the graph view, Dataview queries, and community plugins like Templater and Web Clipper are first-class to the user experience.

## Key Facts

- Version 1.5+ is recommended for graph view and plugin compatibility.
- Wikilink resolution matches filenames or `aliases:` entries — not page titles — so the title must appear as the first entry in `aliases:`.
- The [[Dataview]] community plugin powers `vault/wiki/dashboard.md`; without it the dashboard renders as empty code blocks.
- Per-topic graph colors are applied programmatically via the `/llm-wiki-stack:obsidian-graph-colors` skill.

## Related

- [[Dataview]] — the query plugin the dashboard depends on.
- [[Claude Code]] — the host running the plugin that maintains this vault.
