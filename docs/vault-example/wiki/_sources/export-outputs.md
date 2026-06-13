---
title: "Export Data, Create Output"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Export Data, Create Output"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

Describes `vault/output/` as git-ignored scratch space for deliverables compiled from the wiki. Explains the analyst agent's compile workflow, two healthy output patterns (narrative vs navigation index), versioning options, and external format conversion with pandoc.

## Key Claims

- `vault/output/` is plain markdown — no frontmatter, no schema, no validation.
- The analyst agent reads the vault MOC and per-folder MOCs, pulls named entities/concepts/synthesis notes, and writes to `vault/output/<slug>.md` with `[[wikilink]]` citations.
- Two patterns: narrative output (front-to-back document with its own voice) and navigation index (pointer document routing to canonical wiki pages).
- Analysis that belongs in `_synthesis/` must not go into `output/`; synthesis stays in the wiki and is cited by deliverables.
- `protect-raw.sh` blocks writes to `vault/raw/`.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Exporting Outputs]]
- [[Provenance-Tracked Wiki]]
