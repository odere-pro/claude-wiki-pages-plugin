---
title: "path-qualified wikilink"
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

# path-qualified wikilink

## Definition

A piped wikilink whose target is the wiki-relative path (no extension) rather than a bare basename, used when the basename is not unique across the whole vault: `ADR-0001: X`. Disambiguates a `wiki/` page from a `raw/` original that shares its basename, which a bare-basename link would silently misroute to. See ADR-0032.

## Key Principles

- A piped wikilink whose target is the wiki-relative path (no extension) rather than a bare basename, used when the basename is not unique across the whole vault: `ADR-0001: X`.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `ADR-0001: X`
- `wiki/`
- `raw/`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
