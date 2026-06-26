---
title: "node universe"
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

# node universe

## Definition

The set of pages counted as graph nodes for connectivity: every `wiki/` page minus the `userIgnoreFilters` paths (`raw/`, `_templates/`, `_proposed/`) and the scratch quarantine folders (`output/`, `_inbox/`). Defines the scope over which "every node reachable" is asserted. See ADR-0031.

## Key Principles

- The set of pages counted as graph nodes for connectivity: every `wiki/` page minus the `userIgnoreFilters` paths (`raw/`, `_templates/`, `_proposed/`) and the scratch quarantine folders (`output/`, `_inbox/`).
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wiki/`
- `userIgnoreFilters`
- `raw/`
- `_templates/`
- `_proposed/`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
