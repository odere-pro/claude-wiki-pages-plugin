---
title: "Wikilink Extractor (wikilinks.ts)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["typescript", "wikilinks", "parser", "engine"]
aliases: ["Wikilink Extractor (wikilinks.ts)"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Wikilink Extractor (wikilinks.ts)

## Metadata

- **Author:** claude-wiki-pages plugin project
- **Publisher:** claude-wiki-pages plugin project
- **Published:** 2026-06-13
- **URL:** raw/repo/knowledge-graph/wikilinks.ts

## Summary

`wikilinks.ts` implements wikilink extraction and the markdown-link guard. It ports
the `check_content()` logic from `scripts/check-wikilinks.sh` and the link-scraping
from `scripts/verify-ingest.sh` CHECK 1 into typed TypeScript.

The module exports three functions: `extractWikilinks` (extracts all wikilink targets
targets from a body string, in document order, dropping any display alias after the
pipe character), `duplicates` (returns a Map of targets that appear more than once
with their counts, used for index deduplication), and `markdownLinkViolation` (detects
raw markdown links — the non-wikilink variety — in a page body, ignoring frontmatter
and fenced code blocks, returning a guard message string or null when clean).

The implementation strips fenced code blocks before checking for markdown-link
violations to avoid false positives on code examples containing paths. The strip
logic mirrors the bash `sed '/^```/,/^```/d'` idiom.

## Key Claims

- `extractWikilinks` operates on the `body` string only; frontmatter must be
  stripped by the caller before passing.
- The wikilink regex drops everything from the pipe `|` onward (the display alias).
- `duplicates` returns only entries with count > 1, not the full frequency map.
- `markdownLinkViolation` uses `splitFrontmatter` (imported from `frontmatter.ts`)
  to isolate the body before scanning.
- Fenced block stripping is stateful (inFence toggle per line), matching the bash
  idiomatic approach.
- The guard message is a human-readable string instructing conversion to wikilinks
  for Obsidian compatibility.
