---
title: "topic path"
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

# topic path

## Definition

A page's chain of ancestors from its immediate parent up to ROOT (`wiki/index.md`), following `parent:`. Its length is the page's depth (ROOT is 0). The `pathToRoot` field of a `deriveSpine` node; used to detect transitive-redundant edges (a link to a page already on the topic path) and pages that never reach ROOT. See ADR-0036.

## Key Principles

- A page's chain of ancestors from its immediate parent up to ROOT (`wiki/index.md`), following `parent:`.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wiki/index.md`
- `parent:`
- `pathToRoot`
- `deriveSpine`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, tag de-cycling, oversaturation.
