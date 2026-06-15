---
title: "Frontmatter Parser (frontmatter.ts)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["typescript", "frontmatter", "parser", "engine"]
aliases: ["Frontmatter Parser (frontmatter.ts)"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Frontmatter Parser (frontmatter.ts)

## Metadata

- **Author:** claude-wiki-pages plugin project
- **Publisher:** claude-wiki-pages plugin project
- **Published:** 2026-06-13
- **URL:** raw/repo/knowledge-graph/frontmatter.ts

## Summary

`frontmatter.ts` implements frontmatter parsing for wiki pages. It uses the
battle-tested `yaml` library rather than the awk/sed heuristics in
`scripts/verify-ingest.sh`. On well-formed vault fixtures the two implementations
agree — this parity is enforced by a gate test.

The module exports five functions: `splitFrontmatter` (splits a markdown document
into its leading `--- … ---` YAML block and body), `parseFrontmatter` (parses the
YAML block into an object, returning `{}` on absent or invalid input),
`titleOf` (returns the `title:` value or falls back to the filename stem),
`stringList` (coerces a frontmatter field into a list of strings, handling both
inline and block YAML array forms), and `stripWikilink` (strips the double-bracket wikilink wrapper
wikilink wrapper from a string).

The `SplitDoc` interface carries `frontmatter: string | null` and `body: string`.
Unterminated frontmatter is treated as absent (whole file is `body`), mirroring the
bash `sed` fallback behavior.

## Key Claims

- The YAML block is the content between the first `---` and the next `---` on a line
  by itself; the opening `---` must be on line 0.
- `parseFrontmatter` returns `{}` (not throws) when frontmatter is absent or malformed.
- `titleOf` mirrors the bash default: returns the filename stem when `title:` is
  absent or empty.
- `stringList` handles both `["a", "b"]` (array) and `"a"` (single string) input forms.
- `stripWikilink` handles the wikilink-unwrap transformation (removes the double-bracket delimiters) used when
  processing the `sources:` and `related:` wikilink arrays.
- Parity with `verify-ingest.sh` on well-formed fixtures is enforced by a gate test.

## Concepts Covered

- [[Frontmatter Parser]]
- [[Provenance Checks]]
- [[Schema Version Gate]]
- [[Wikilink Extractor]]
- [[Shell-TS Parity]]

## Grounded Pages

Wiki pages that cite this source:

- [[Frontmatter Parser]] — the concept page this source directly backs (five exported functions, yaml-library parser)
