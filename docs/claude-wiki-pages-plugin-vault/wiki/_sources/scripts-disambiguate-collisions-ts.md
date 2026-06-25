---
title: "scripts/disambiguate-collisions.ts"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/disambiguate-collisions.ts

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/disambiguate-collisions.ts

## Summary

Path-qualifies wikilinks whose bare basename is ambiguous across the entire vault (not just wiki/). Many `wiki/_sources/X.md` summaries share a basename with their `raw/.../X.md` original, causing bare `[[X|display]]` links to resolve to the raw file. This rewrites such links to the wiki-relative path form for unambiguous resolution.

## Key Claims

Global basename frequency is computed across all files in the vault (wiki + raw). Non-colliding basenames are left unchanged. Operates on wiki/ files only (raw/ is immutable). Dry-run by default (`--write` to apply). Uses the engine's `buildLinkIndex` and `resolveLink` for Obsidian-accurate resolution.

Covers: Basename Collision Resolution, Wikilink Disambiguation, Piped Link Convention
