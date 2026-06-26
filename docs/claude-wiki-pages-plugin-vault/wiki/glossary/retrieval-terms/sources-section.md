---
title: "Sources section"
type: concept
aliases: []
parent: "[[retrieval-terms|Retrieval terms]]"
path: "glossary/retrieval-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "retrieval-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# Sources section

## Definition

The grounding contract on query answers: every analyst/query answer ends with a `## Sources` heading — a numbered, research-paper-style list citing each consulted wiki page as a `wikilink` plus the raw source file path(s) from that page's `sources:` frontmatter. The audit surface that complements inline citations. See ADR-0022.

## Key Principles

- The grounding contract on query answers: every analyst/query answer ends with a `## Sources` heading — a numbered, research-paper-style list citing each consulted wiki page as a `wikilink` plus the raw source file path(s) from that page's `sources:` frontmatter.
- Canonical term in the claude-wiki-pages **Retrieval terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `## Sources`
- `wikilink`
- `sources:`

## Related Concepts

Part of the **Retrieval terms** group: synonym lexicon, synonym expansion, query expansion, stemming, graph link-walk, graph-traversal primitive, candidate filter, score breakdown, match component, working set, MOC descent, context budget.
