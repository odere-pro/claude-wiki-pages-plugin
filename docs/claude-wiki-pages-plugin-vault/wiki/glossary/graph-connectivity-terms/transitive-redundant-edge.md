---
title: "transitive-redundant edge"
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

# transitive-redundant edge

## Definition

A non-spine `wikilink` `A`→`C` where `C` is already on `A`'s topic path (an ancestor reached through the spine), so the edge carries no navigation the spine does not. Provably redundant and auto-demoted by the strict-tree reducer. Counted as `transitiveRedundantEdgeCount` by `graph-quality`. See ADR-0036.

## Key Principles

- A non-spine `wikilink` `A`→`C` where `C` is already on `A`'s topic path (an ancestor reached through the spine), so the edge carries no navigation the spine does not.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wikilink`
- `A`
- `C`
- `transitiveRedundantEdgeCount`
- `graph-quality`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling.
