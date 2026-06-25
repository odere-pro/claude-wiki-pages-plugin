---
title: "src/core/wikilinks.ts — Wikilink Extraction"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "wikilinks", "parsing"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/wikilinks.ts — Wikilink Extraction

## Metadata

- **Source**: `raw/repo/src/core/wikilinks.ts`
- **Type**: TypeScript implementation

## Summary

Wikilink extraction and the markdown-link guard. Ports `scripts/check-wikilinks.sh check_content()` and the link-scraping in `scripts/verify-ingest.sh CHECK 1`.

## Key Claims

- `extractWikilinks(body)`: extracts all `[[Target]]` targets in document order; drops alias portion after `|`
- `duplicates(targets)`: returns a Map of targets that appear more than once with their counts (for index dedup)
- `markdownLinkViolation(content)`: detects markdown-style file links in the page body, ignoring frontmatter and fenced code blocks; uses `s` (dotAll) flag to catch CR-containing links
- `stripFencedBlocks(body)`: removes fenced code blocks to avoid false positives on examples
- Alias portion after `|` is dropped during extraction; piped wikilinks resolved by target, not display text
Covers: Wikilink Extraction, Markdown Link Guard, extractWikilinks, markdownLinkViolation
