---
title: "match component"
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

# match component

## Definition

One entry in a `score breakdown` — a `{channel, term, hits, points}` record naming which scoring channel (title-phrase, title-term, tag-term, body-term) a query term fired and the points it contributed. The atom of `matched{}`; a hit's `score` equals the sum of its match components' `points`.

## Key Principles

- One entry in a `score breakdown` — a `{channel, term, hits, points}` record naming which scoring channel (title-phrase, title-term, tag-term, body-term) a query term fired and the points it contributed.
- Canonical term in the claude-wiki-pages **Retrieval terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `score breakdown`
- `{channel, term, hits, points}`
- `matched{}`
- `score`
- `points`

## Related Concepts

Part of the **Retrieval terms** group: synonym lexicon, synonym expansion, query expansion, stemming, graph link-walk, graph-traversal primitive, candidate filter, score breakdown, working set, MOC descent, context budget, tag taxonomy.
