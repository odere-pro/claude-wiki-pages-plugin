---
title: "Obsidian-accurate link resolution"
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

# Obsidian-accurate link resolution

## Definition

Resolving a `link` to the exact page Obsidian would open, by a priority ladder: exact vault path > file basename (case-insensitive) > alias (case-insensitive). A real file basename always beats an alias. Ties broken by shortest vault-relative path, then same-folder-as-source, then alphabetical. Implemented in `src/core/link-resolver.ts`; the basis for the collision and connectivity checks. See ADR-0030.

## Key Principles

- Resolving a `link` to the exact page Obsidian would open, by a priority ladder: exact vault path > file basename (case-insensitive) > alias (case-insensitive).
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `link`
- `src/core/link-resolver.ts`

## Related Concepts

Part of the **Graph connectivity terms** group: wikilink collision, shadow edge, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
