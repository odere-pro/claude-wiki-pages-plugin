---
title: "Link Demote"
type: concept
aliases: ["link-demote", "Wikilink Demotion", "demoteBodyLinks", "Strict-Tree Reduction"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-link-demote|src/core/link-demote.ts — Wikilink Demotion]]"]
related: []
tags: ["src", "core", "link-demote", "strict-tree", "text-rewriting"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Link Demote

The ONE demote-not-delete core (ADR-0036). Fence- and inline-span-aware text surgery that turns a rejected `[[wikilink]]` into its plain display text without ever creating a dangling link. Parameterised by a caller-supplied keep predicate.

## Definition

`core/link-demote.ts` provides the text-rewriting primitives for the strict-tree reducer (`scripts/strict-tree-reduce.ts`). The "policy" (which links to keep) is the caller's; this module is pure text rewriting — no vault walk, no resolver, no I/O.

## Key Principles

**`KeepLink` type**: `(raw: string) => boolean`. The caller binds the source page context and decides what to keep; `link-demote.ts` only handles the mechanics.

**`demoteBodyLinks(body, keep)`**: rewrites body `[[wikilinks]]` the predicate rejects to plain display text. Skips:
- Fenced code blocks (triple-backtick sections)
- Inline code spans (backtick-delimited segments via `splitCodeSpans()`)

**`pruneFrontmatterArray(fm, field, keep)`**: removes entries from association frontmatter arrays (e.g. `related:`, `depends_on:`) where the predicate rejects the raw entry.

**`linkDisplay(raw)`**: returns the Obsidian display text — the piped alias if present, else the bare target minus anchor. Used when replacing a `[[wikilink]]` with its display text.

**`splitCodeSpans()`**: splits a line into `[segment, isCodeSpan]` pairs so inline code is never rewritten. Generator function for memory efficiency on long lines.

**`FrontmatterSplit`**: `{ fm, body, block }` — `block` preserves the exact `--- … ---` text so a rewrite can reassemble the file byte-for-byte without changing the frontmatter delimiter.

**Demote, not delete**: the target page is never removed — the link becomes its display text, preserving the human meaning while removing the graph edge.

## Examples

- `[[agents|Agents]]` rejected → body text `Agents` (the display alias)
- `[[spine-module|Spine Module]]` rejected → body text `Spine Module`
- Frontmatter `related: ["[[agents|Agents]]"]` with keep returning false → `related: []`

## Related Concepts

- Backed by `scripts/strict-tree-reduce.ts` (the only caller)
- ADR-0036: strict-tree topology defines which links are kept (spine only)
- `LINK_RE` regex is exported for reuse by other text-surgery tools
