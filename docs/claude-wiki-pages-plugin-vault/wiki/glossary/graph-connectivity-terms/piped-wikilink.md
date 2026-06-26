---
title: "piped wikilink"
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

# piped wikilink

## Definition

A `Display` link whose target is the destination's file basename (the resolving part Obsidian reads) and whose display text is the Title-Case page title. The required cross-page link form, because Obsidian resolves by basename/path only — never by `aliases:` or `title:` — so a bare `Title Case` does not resolve. Applies in body text and every frontmatter link field. See ADR-0032.

## Key Principles

- A `Display` link whose target is the destination's file basename (the resolving part Obsidian reads) and whose display text is the Title-Case page title.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `Display`
- `aliases:`
- `title:`
- `Title Case`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, shadow edge, connected component, orphan node, node universe, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
