---
title: "ADR-0022: Folder Notes and Graph Quality"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-12
date_ingested: 2026-06-25
tags: ["docs", "adr", "schema"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0022: Folder Notes and Graph Quality

## Metadata

- File: `raw/repo/docs/adr/ADR-0022-folder-notes-and-graph-quality.md`
- Status: Accepted (amended by ADR-0023)

## Summary

Schema v3: per-folder index becomes a folder note named after its folder (wiki/<topic>/<topic>.md, type: index). parent:/children:/child_indexes: MUST be quoted [[wikilink]] values. Query answers must end with a Sources section. Graph color groups gain a headless fallback.

## Key Claims

Problem: eight topic folders all showed as _index nodes — navigational backbone invisible in graph. Three gaps: (1) parent:/children:/child_indexes: were convention not contract — plain title string produces no graph edge; (2) white file:_index catch-all color group flattened all indexes; (3) query answers had no single evidence section. Decision: folder note = wiki/<topic>/<topic>.md, filename stem == parent dir name; legacy _index.md flagged legacy-index-filename at schema_version 3; root index stays wiki/index.md. parent:/children:/child_indexes: MUST be quoted [[wikilink]] values — plain string is a lint finding. Every query answer ends with ## Sources (numbered, research-paper style: [[wikilink]] + raw source paths). Graph colors: headless fallback writes .obsidian/graph.json directly when obsidian eval unavailable. Hierarchy fields gain a topic-locality note in the predicate table (ADR-0004).

Covers: Folder Notes, Schema v3, Hierarchy Wikilinks, Sources Section, Graph Colors
