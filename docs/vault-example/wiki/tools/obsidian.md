---
title: "Obsidian"
type: entity
entity_type: tool
aliases: ["Obsidian"]
parent: "[[Tools]]"
path: "tools"
sources:
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
  - "[[Review, Validate, Fix]]"
  - "[[Check the Dashboard]]"
  - "[[Query the Wiki]]"
related:
  - "[[Dataview]]"
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# Obsidian

Obsidian (version 1.5+) is the note-taking application used as the vault viewer. It renders `[[wikilinks]]`, displays the graph view, and executes Dataview queries. Its use is optional — the plugin maintains the wiki whether or not Obsidian is open — but the graph view and Dataview dashboard are only available inside Obsidian.

## Setup steps

1. **Open folder as vault** — select the `vault/` directory.
2. Install community plugins: **Dataview**, **Templater**, **Web Clipper**.
3. Templater → set template folder to `_templates`.
4. Web Clipper → set save location to `vault/raw/`.
5. From a Claude session, run `/claude-wiki-pages:obsidian-graph-colors` once to apply per-topic graph colors.

## Excluded paths

`raw/`, `_templates/`, and `_proposed/` are excluded from Obsidian's index via `.obsidian/app.json` (`userIgnoreFilters`). They never appear in the graph, search, or link autocomplete.

## Graph view

Each top-level topic folder gets a unique color group. `_sources` are gray; `_synthesis` are yellow. Colors are regenerable cache — if `.obsidian/graph.json` is lost, re-run `/claude-wiki-pages:obsidian-graph-colors`.
