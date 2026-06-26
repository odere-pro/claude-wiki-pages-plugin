---
title: "orphan node"
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

# orphan node

## Definition

A node with degree 0 — no resolving link into it and none out of it. Renders as an isolated point in Obsidian's graph. The objective health target is zero orphans (paired with one connected component). Distinct from `dangling wikilink`, which is an outgoing link with no target; an orphan is a page with no edges at all. See ADR-0031.

## Key Principles

- A node with degree 0 — no resolving link into it and none out of it.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `dangling wikilink`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
