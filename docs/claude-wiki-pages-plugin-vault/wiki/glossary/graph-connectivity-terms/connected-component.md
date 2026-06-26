---
title: "connected component"
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

# connected component

## Definition

A maximal set of nodes mutually reachable through resolving links (treated undirected, body plus frontmatter). The objective connectivity measure: a graph is "one piece" iff it has exactly one component. Computed by `scripts/graph-quality.sh`. See ADR-0031.

## Key Principles

- A maximal set of nodes mutually reachable through resolving links (treated undirected, body plus frontmatter).
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/graph-quality.sh`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
