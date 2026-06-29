---
title: "tag de-cycling"
type: concept
aliases: []
parent: "[[graph-connectivity-terms|Graph connectivity terms]]"
path: "glossary/graph-connectivity-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "graph-connectivity-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# tag de-cycling

## Definition

Replacing a demoted cross-tree edge `A`(tree X)→`B`(tree Y) with the nested tag `topic/<Y>` on `A`, so the relationship stays discoverable in the tag view and color groups while the graph stays acyclic between trees. Trading a cycle-closing edge for a shared tag. Applied by `scripts/strict-tree-reduce.sh`. See ADR-0036.

## Key Principles

- Replacing a demoted cross-tree edge `A`(tree X)→`B`(tree Y) with the nested tag `topic/<Y>` on `A`, so the relationship stays discoverable in the tag view and color groups while the graph stays acyclic between trees.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `A`
- `B`
- `topic/<Y>`
- `scripts/strict-tree-reduce.sh`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, oversaturation.
