---
title: "context budget"
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

# context budget

## Definition

The maximum token allocation reserved for wiki-page content in a single LLM call. Constrains MOC descent depth and the size of the working set.

## Key Principles

- The maximum token allocation reserved for wiki-page content in a single LLM call.
- Canonical term in the claude-wiki-pages **Retrieval terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- Defined in `docs/GLOSSARY.md`; see the Canonical Glossary overview for usage in context.

## Related Concepts

Part of the **Retrieval terms** group: synonym lexicon, synonym expansion, query expansion, stemming, graph link-walk, graph-traversal primitive, candidate filter, score breakdown, match component, working set, MOC descent, tag taxonomy.
