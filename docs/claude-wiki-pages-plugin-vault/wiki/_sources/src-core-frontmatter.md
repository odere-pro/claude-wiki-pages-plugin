---
title: "src/core/frontmatter.ts — Frontmatter Parsing"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "frontmatter", "parsing"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/frontmatter.ts — Frontmatter Parsing

## Metadata

- **Source**: `raw/repo/src/core/frontmatter.ts`
- **Type**: TypeScript implementation

## Summary

Frontmatter parsing for wiki pages. A splitter isolates the leading `--- … ---` YAML block; the block itself is parsed with the `yaml` library rather than awk/sed heuristics. On well-formed vault fixtures the two implementations agree, which the parity gate asserts.

## Key Claims

- `splitFrontmatter(content)`: splits a markdown document into `{ frontmatter, body }` — returns `frontmatter: null` for unterminated or absent frontmatter
- `parseFrontmatter(content)`: parses the frontmatter block into `Record<string, unknown>`; returns `{}` when absent or invalid YAML
- `titleOf(content, filePath)`: returns the `title:` value, falling back to the filename stem
- `stringList(value)`: coerces a frontmatter field into `string[]` (handles inline or block YAML arrays, and scalar strings)
- `stripWikilink(s)`: strips surrounding `[[ … ]]` wrapper leaving the inner target
- Uses the `yaml` library (not awk/sed heuristics) for correctness
- Unterminated frontmatter treated as no frontmatter (whole file is body)
Covers: Frontmatter Parsing, splitFrontmatter, parseFrontmatter, titleOf, stringList
