---
title: "Obsidian Documentation"
type: source
source_type: manual
source_format: text
url: "https://help.obsidian.md/"
author: "Obsidian"
publisher: "Obsidian.md"
date_published: 2026-04-01
date_ingested: 2026-04-18
aliases: ["Obsidian Documentation", "Obsidian docs", "obsidian-docs"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---

# Obsidian Documentation

## Metadata

- **Author:** Obsidian
- **Publisher:** Obsidian.md
- **Published:** 2026-04-01
- **URL:** https://help.obsidian.md/

## Summary

Obsidian vaults are plain-filesystem folders. Notes link to each other with `[[wikilinks]]`, resolved by filename and `aliases`. A broken link creates a "ghost node" in the graph view. YAML frontmatter is queryable via the Dataview plugin and drives graph coloring and wikilink resolution.

## Key Claims

- A vault is a folder on disk. No database.
- `[[Note Title]]` resolves by filename first, then by the `aliases` frontmatter field.
- A link whose target does not exist creates a ghost node in the graph view.
- YAML frontmatter is queryable via the Dataview plugin.

## Entities Mentioned

- [[Obsidian]]

## Concepts Covered

- [[Hook-Enforced Guarantees]]
