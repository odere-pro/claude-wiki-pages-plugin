---
title: "strict tree"
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

# strict tree

## Definition

The target topology where the only `wikilink` edges among visible topic pages are spine edges (parent↔child) plus the single ROOT→folder-note spine; every associative or cross-tree relationship is a shared tag, not an edge. The stricter successor to topic-local linking — topic-local still permits intra-topic non-spine edges, the within-island hairball strict tree removes. Derived by `deriveSpine` in `src/core/spine.ts`. See ADR-0036.

## Key Principles

- The target topology where the only `wikilink` edges among visible topic pages are spine edges (parent↔child) plus the single ROOT→folder-note spine; every associative or cross-tree relationship is a shared tag, not an edge.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wikilink`
- `deriveSpine`
- `src/core/spine.ts`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, spine edge, topic path, tag de-cycling, oversaturation.
