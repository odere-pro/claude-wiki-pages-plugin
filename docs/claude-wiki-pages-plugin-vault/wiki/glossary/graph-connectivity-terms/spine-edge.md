---
title: "spine edge"
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

# spine edge

## Definition

A `wikilink` along the `parent:` hierarchy: a page → its folder note, a folder note → its `children`/`child_indexes`, or the ROOT hub → a top-level folder note. The only edges a strict tree draws. Distinct from an associative edge (`related:`, sibling "see also"), which the strict-tree reducer demotes. See ADR-0036.

## Key Principles

- A `wikilink` along the `parent:` hierarchy: a page → its folder note, a folder note → its `children`/`child_indexes`, or the ROOT hub → a top-level folder note.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wikilink`
- `parent:`
- `children`
- `child_indexes`
- `related:`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, topic path, tag de-cycling, oversaturation.
