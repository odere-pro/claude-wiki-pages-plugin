---
title: "src/core/link-demote.ts — Wikilink Demotion"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "link-demote", "strict-tree"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/link-demote.ts — Wikilink Demotion

## Metadata

- **Source**: `raw/repo/src/core/link-demote.ts`
- **Type**: TypeScript implementation

## Summary

The ONE demote-not-delete core (ADR-0036). Fence- and inline-span-aware text surgery that turns a rejected `[[wikilink]]` into its plain display text, and prunes rejected entries from association frontmatter arrays — without ever creating a dangling link. Backs the strict-tree reducer, parameterised by a keep predicate.

## Key Claims

- `KeepLink` type: predicate `(raw: string) => boolean` — policy (what to keep) is the caller's, not this module's
- `demoteBodyLinks(body, keep)`: rewrites body `[[wikilinks]]` the predicate rejects to display text; skips fenced code blocks and inline code spans
- `pruneFrontmatterArray(fm, field, keep)`: removes entries from association frontmatter arrays where the predicate rejects
- `linkDisplay(raw)`: returns Obsidian display text (the piped alias, else the bare target minus anchor)
- `splitCodeSpans()`: splits a line into [segment, isCodeSpan] runs so inline code is never rewritten
- Pure text rewriting: no vault walk, no resolver, no I/O — Node built-ins only
- `FrontmatterSplit`: preserves exact `block` text so a rewrite can reassemble the file byte-for-byte
- Backed by: `scripts/strict-tree-reduce.ts`
Covers: Wikilink Demotion, Strict-Tree Reduction, KeepLink Predicate, demoteBodyLinks
