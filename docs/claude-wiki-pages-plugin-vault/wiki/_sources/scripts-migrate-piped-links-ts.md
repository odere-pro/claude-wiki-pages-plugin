---
title: "scripts/migrate-piped-links.ts"
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

# scripts/migrate-piped-links.ts

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/migrate-piped-links.ts

## Summary

Migrates alias-targeted and title-targeted wikilinks to Obsidian-resolvable piped form. Rewrites every link whose target currently resolves only by alias or title into `[[basename|Title Case display]]`, preserving the readable display text. Operates on wiki/ only. Implements the piped-link convention ADR.

## Key Claims

Links already resolving by path/basename are left untouched. Genuinely dangling links are left untouched (never fabricated). Uses `buildLinkIndex` for the resolution index. `targetToken` function selects basename when uniquely identifying and wiki-relative path when ambiguous. Dry-run by default; `--write` applies changes.

Covers: Piped Link Migration, Wikilink Resolution, Alias-to-Basename Rewrite
