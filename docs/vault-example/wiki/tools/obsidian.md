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

A note-taking application (version 1.5+) used as the vault viewer, graph explorer, and Dataview dashboard host alongside the `claude-wiki-pages` plugin.

## Overview

Obsidian renders `[[wikilinks]]`, displays the interactive graph view, and executes Dataview queries against frontmatter. Its use alongside the plugin is optional — the plugin maintains the wiki whether or not Obsidian is open — but the graph view and live [[Dashboard Monitoring]] are only available inside Obsidian.

The vault is opened in Obsidian by selecting the `vault/` directory as a vault folder. Community plugins Dataview, Templater, and Web Clipper are recommended for the full experience.

## Key Facts

Excluded paths — `raw/`, `_templates/`, and `_proposed/` are excluded from Obsidian's index via `.obsidian/app.json` (`userIgnoreFilters`). They never appear in the graph, search results, or link autocomplete, and they never receive graph color groups.

Graph coloring — each top-level topic folder gets a unique color group applied by `/claude-wiki-pages:obsidian-graph-colors`. The `_sources` folder is gray; `_synthesis` is yellow. Graph color groups are regenerable cache: if `.obsidian/graph.json` is lost, delete it and re-run the command.

Recommended setup steps:

1. Open folder as vault → select `vault/`.
2. Install community plugins: Dataview, Templater, Web Clipper.
3. Templater → set template folder to `_templates`.
4. Web Clipper → set save location to `vault/raw/`.
5. From a Claude session, run `/claude-wiki-pages:obsidian-graph-colors` once.

Static snapshots — the Obsidian CLI can render Dataview queries and write the result to `vault/wiki/dashboard-snapshot.md`, producing a static version for sharing outside Obsidian.

## Related

- [[Dataview]] — the Obsidian community plugin that powers the live dashboard.
- [[claude-wiki-pages Plugin]] — the plugin that manages the vault Obsidian displays.
