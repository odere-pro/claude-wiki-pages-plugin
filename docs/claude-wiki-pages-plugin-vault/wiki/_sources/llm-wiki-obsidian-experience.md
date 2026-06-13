---
title: "User Guide: Obsidian Experience"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["guide", "obsidian", "graph", "polish"]
aliases: ["User Guide: Obsidian Experience"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# User Guide: Obsidian Experience

## Summary

Polish agent behavior: graph colors, index refresh, MOC consistency. Troubleshooting graph issues. The wiki-only graph (ADR-0023): only `wiki/` pages appear in the graph.

## Key Claims

- Polish agent runs after every ingest or curator pass: (1) applies graph colors for new topic folders, (2) regenerates `wiki/index.md`, (3) reconciles folder note children.
- Graph shows only `wiki/` pages — `raw/`, `_templates/`, `_proposed/` are excluded.
- Troubleshooting: monochrome graph → run `/claude-wiki-pages:obsidian-graph-colors`; missing topic colors → run polish agent; `.obsidian/` corrupted → delete and re-run `obsidian-graph-colors`.
- Headless fallback: when Obsidian CLI is unavailable, `obsidian-graph-colors` writes `.obsidian/graph.json` directly; restart Obsidian after a headless write.

## Entities Mentioned

- [[Polish Agent]]

## Concepts Covered

- [[Wiki-Only Graph]]
- [[Graph Coloring]]
- [[Graph Config Cache]]
