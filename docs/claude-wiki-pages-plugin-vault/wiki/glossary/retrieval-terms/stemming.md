---
title: "stemming"
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

# stemming

## Definition

Reducing query and page tokens to their root form (e.g. "running" → "run") so morphological variants match. Applied deterministically in the Bun engine; no ML model involved.

## Key Principles

- Reducing query and page tokens to their root form (e.g.
- Canonical term in the claude-wiki-pages **Retrieval terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- Defined in `docs/GLOSSARY.md`; see the Canonical Glossary overview for usage in context.

## Related Concepts

Part of the **Retrieval terms** group: synonym lexicon, synonym expansion, query expansion, graph link-walk, graph-traversal primitive, candidate filter, score breakdown, match component, working set, MOC descent, context budget, tag taxonomy.
