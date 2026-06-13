---
title: "ADR-0022: Folder Notes and Graph Quality"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "folder-notes", "graph", "schema-v3"]
aliases: ["ADR-0022: Folder Notes and Graph Quality"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0022: Folder Notes and Graph Quality

## Summary

Introduces schema v3 folder notes (`wiki/<topic>/<topic>.md`, `type: index`). Hierarchy fields (`parent`, `children`, `child_indexes`) must be quoted wikilink values. Drops the `file:_index` catch-all group. Establishes the `## Sources` grounding contract on query answers.

## Key Claims

- Schema v3: per-folder index is a folder note named exactly after its folder (`wiki/<topic>/<topic>.md`).
- Hierarchy fields must be quoted `"[[wikilink]]"` values — plain strings produce no graph edge and are a lint finding.
- The `file:_index` catch-all color group is dropped; folder notes inherit their topic's group via `path:wiki/<topic>` query.
- `## Sources` grounding contract: every analyst/query answer ends with a numbered `## Sources` section citing consulted pages as `[[wikilinks]]` plus raw source paths.
- Legacy `_index.md` is accepted but flagged `legacy-index-filename`.

## Entities Mentioned

- [[Polish Agent]]

## Concepts Covered

- [[Folder Note]]
- [[Graph Coloring]]
- [[Schema Authority]]
- [[Sources Section]]

## Grounded Pages

Wiki pages that cite this source:

- [[Wiki-Only Graph]] — builds on ADR-0022 graph quality work
- [[Polish Agent]] — canonical group order from ADR-0022
- [[Folder Note]] — folder note definition per schema v3
- [[Query Rules]] — Sources section contract
- [[Obsidian Experience]] — Obsidian-side graph quality
