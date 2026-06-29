---
title: "oversaturation"
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

# oversaturation

## Definition

A node whose out-degree exceeds a configurable threshold (sane default ~20), visually dominating the tree and re-fusing it. Reported by `graph-quality`/`tree-lint` as `maxSaturation`; the reducer auto-demotes only the provably transitive-redundant subset and otherwise suggests an intermediate hub, because cutting a genuine spine fan-out would orphan children. See ADR-0036.

## Key Principles

- A node whose out-degree exceeds a configurable threshold (sane default ~20), visually dominating the tree and re-fusing it.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `graph-quality`
- `tree-lint`
- `maxSaturation`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling.
