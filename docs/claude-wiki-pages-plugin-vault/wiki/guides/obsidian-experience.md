---
title: "Obsidian Experience"
type: concept
aliases: ["Obsidian Experience", "obsidian experience", "Obsidian integration", "graph view"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[User Guide: Obsidian Experience]]", "[[ADR-0023: Wiki-Only Graph]]", "[[ADR-0022: Folder Notes and Graph Quality]]", "[[ADR-0003: Polish Agent and Obsidian-Side]]"]
related: ["[[Polish Agent]]", "[[Wiki-Only Graph]]", "[[Graph Coloring]]", "[[Folder Note]]"]
tags: ["concept", "obsidian", "guide"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Obsidian Experience

## Definition

The Obsidian experience refers to the graph view, search, and link autocomplete behavior that the polish agent maintains after every ingest or curator pass. The wiki-only graph shows only `wiki/` pages.

## Key Principles

- **Graph shows only `wiki/` pages:** `raw/`, `_templates/`, `_proposed/` are excluded via `.obsidian/app.json` `userIgnoreFilters`.
- **Color groups (topics → specials):** each top-level topic folder gets a unique color; `_sources` is gray, `_synthesis` is yellow.
- **Polish agent owns the Obsidian side:** runs three idempotent steps after every write (graph colors, index refresh, folder note reconciliation).
- **Headless fallback:** when Obsidian CLI is unavailable, write `.obsidian/graph.json` directly. Restart Obsidian after a headless write.
- **Troubleshooting:**
  - Monochrome graph → run `/claude-wiki-pages:obsidian-graph-colors`.
  - Missing topic colors → run polish agent.
  - Corrupted `.obsidian/` → delete and re-run `obsidian-graph-colors`.

## Examples

A new top-level topic folder `wiki/retrieval/` is created by ingest → polish agent adds `path:wiki/retrieval/` color group to `.obsidian/graph.json` in the next run.

## Related Concepts

- [[Polish Agent]] — owns all three Obsidian-side steps
- [[Wiki-Only Graph]] — the exclusion contract
- [[Graph Coloring]] — the color group management
- [[Folder Note]] — drives the `path:wiki/<topic>` color group queries
