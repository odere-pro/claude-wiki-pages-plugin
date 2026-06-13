---
title: "Query Rules"
type: concept
aliases: ["Query Rules", "query rules", "query workflow", "query protocol"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[Architecture Documentation]]", "[[User Guide 07: Query the Wiki]]", "[[ADR-0022: Folder Notes and Graph Quality]]"]
related: ["[[Analyst Agent]]", "[[Challenge Mode]]", "[[Sources Section]]", "[[Wiki-Native Recall]]"]
tags: ["concept", "query"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Query Rules

## Definition

Query rules are the structured workflow for answering questions from the wiki. Every query answer must cite `[[wikilinks]]` and end with a `## Sources` section.

## Key Principles

The 7 query steps (from `vault/CLAUDE.md`):

1. Read `wiki/index.md` first to find relevant pages.
2. For topic-scoped queries, start from the relevant folder note and traverse downward.
3. Read matching pages. Follow wikilinks to gather context.
4. Synthesize an answer with `[[wikilink]]` citations to specific wiki pages.
5. End every answer with a `## Sources` section — numbered, research-paper style: one entry per consulted wiki page as `[[wikilink]]` plus raw source file path(s) from that page's `sources:` frontmatter.
6. If the answer is valuable and novel, offer to file it as a synthesis note in `wiki/_synthesis/`.
7. Append to `wiki/log.md`: `## [YYYY-MM-DD] query | Question summary`.

## Examples

A query "what is the NO-RAG principle?" → reads [[NO-RAG Principle]], [[Wiki-Native Recall]], [[Deterministic Engine]] → synthesizes an answer → ends with:

```
## Sources
1. [[NO-RAG Principle]] — raw/docs/adr/ADR-0007-wiki-native-recall.md
2. [[Deterministic Engine]] — raw/docs/architecture.md
```

## Related Concepts

- [[Analyst Agent]] — executes queries in Query mode
- [[Challenge Mode]] — adversarial query variant
- [[Sources Section]] — the `## Sources` contract from ADR-0022
- [[Wiki-Native Recall]] — the deterministic retrieval underlying queries
