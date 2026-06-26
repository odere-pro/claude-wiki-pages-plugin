---
title: "score breakdown"
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

# score breakdown

## Definition

The per-match explanation of how a search score was assembled (title hit, tag hit, body hit, graph proximity). Emitted in JSON under the `matched{}` field; used by the analyst for cut-off decisions.

## Key Principles

- The per-match explanation of how a search score was assembled (title hit, tag hit, body hit, graph proximity).
- Canonical term in the claude-wiki-pages **Retrieval terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `matched{}`

## Related Concepts

Part of the **Retrieval terms** group: synonym lexicon, synonym expansion, query expansion, stemming, graph link-walk, graph-traversal primitive, candidate filter, match component, working set, MOC descent, context budget, tag taxonomy.
