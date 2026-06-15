---
title: "Wikilink Extractor"
type: concept
aliases: ["Wikilink Extractor", "wikilink extractor", "extractWikilinks", "markdownLinkViolation"]
parent: "[[knowledge-graph|Knowledge Graph]]"
path: "knowledge-graph"
sources: ["[[wikilinks-ts|Wikilink Extractor (wikilinks.ts)]]"]
related: ["[[frontmatter-parser|Frontmatter Parser]]"]
contradicts: []
supersedes: []
depends_on: ["[[frontmatter-parser|Frontmatter Parser]]"]
tags: ["typescript", "wikilinks", "parsing", "engine", "guard"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Wikilink Extractor

## Definition

The wikilink extractor is a TypeScript module (`wikilinks.ts`) that extracts
wikilinks from markdown body text and enforces the rule that wiki pages
must not contain raw markdown links. It ports `check_content()` from
`scripts/check-wikilinks.sh` and the link-scraping logic from `scripts/verify-ingest.sh`
CHECK 1 into typed TypeScript.

The module exports three pure functions operating on string inputs and returning
typed results. It depends on `splitFrontmatter` from `frontmatter.ts` to isolate
the body before scanning.

## Key Principles

**Body-only extraction.** `extractWikilinks` operates on the body string alone —
the caller must strip frontmatter first. This prevents false positives from frontmatter
fields like `sources:` wikilink arrays being counted as body wikilinks.

**Alias drop.** The extraction regex captures everything from `[[` to the next `]`
or `|`, whichever comes first. The display alias after `|` is dropped — only the
target is returned. This matches how Obsidian resolves wikilinks (by target, not display text).

**Duplicate detection.** `duplicates` returns a `Map<string, number>` containing
only targets that appear more than once. Used by MOC-build primitives and index
consistency checks to detect repeated entries in `children:` arrays.

**Markdown-link guard.** `markdownLinkViolation` detects `[text](path)` links in body
text. It first strips fenced code blocks (stateful toggle, matching the bash
`sed '/^```/,/^```/d'` idiom) to avoid false positives on code examples, then
tests the remaining prose against a regex. Returns a human-readable guard message
or null when clean. This guard is the TypeScript port of the PostToolUse hook
`check-wikilinks.sh`.

## Examples

Three functions and their typical inputs/outputs:

| Function                         | Input            | Output                | Use case                     |
| -------------------------------- | ---------------- | --------------------- | ---------------------------- |
| `extractWikilinks(body)`         | Body string      | `string[]`            | Collect all wikilink targets |
| `duplicates(targets)`            | `string[]`       | `Map<string, number>` | Detect repeated entries      |
| `markdownLinkViolation(content)` | Full file string | `string \| null`      | Enforce wikilinks-only rule  |

`extractWikilinks` feeds the graph walk: every target in the returned array is a
potential graph edge to BFS-traverse. `markdownLinkViolation` is called at write
time via the PostToolUse hook to prevent markdown links from entering the vault.

## Related Concepts

- [[frontmatter-parser|Frontmatter Parser]] — `splitFrontmatter` is imported to separate body from frontmatter
- Provenance Checks — uses extracted wikilinks to verify `sources:` presence
- MOC Repair Primitives — uses `duplicates` to detect and clean repeated `children:` entries
- Graph Walk Algorithm — consumes `extractWikilinks` output as the edge set for BFS traversal
