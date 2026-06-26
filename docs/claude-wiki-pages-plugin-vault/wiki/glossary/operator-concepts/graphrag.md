---
title: "GraphRAG"
type: concept
aliases: []
parent: "[[operator-concepts|Operator concepts]]"
path: "glossary/operator-concepts"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "operator-concepts", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# GraphRAG

## Definition

Graph-aware retrieval: expand a `search` hit along the wikilink graph (`sources`, `related`, `depends_on`) to its N-hop neighbourhood. Documented direction for a future `search --graph`; traversal over the existing graph, not a new index.

## Key Principles

- Graph-aware retrieval: expand a `search` hit along the wikilink graph (`sources`, `related`, `depends_on`) to its N-hop neighbourhood.
- Canonical term in the claude-wiki-pages **Operator concepts** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `search`
- `sources`
- `related`
- `depends_on`
- `search --graph`

## Related Concepts

Part of the **Operator concepts** group: onboarding wizard, default verb, power-user surface, post-install perspective, marketplace.
