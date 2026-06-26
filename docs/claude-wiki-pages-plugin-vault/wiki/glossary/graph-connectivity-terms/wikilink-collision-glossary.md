---
title: "wikilink collision"
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

# wikilink collision

## Definition

A normalised link name that resolves to more than one page — typically one page's filename basename equals another page's `aliases:` entry. Obsidian silently routes to the basename winner, shadowing the alias page, so the link "resolves" but opens the wrong (often thinner) page. Surfaced by `verify` as the WARN-severity check `wikilink-collision`, one finding per colliding name. See ADR-0030.

## Key Principles

- A normalised link name that resolves to more than one page — typically one page's filename basename equals another page's `aliases:` entry.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `aliases:`
- `verify`
- `wikilink-collision`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
