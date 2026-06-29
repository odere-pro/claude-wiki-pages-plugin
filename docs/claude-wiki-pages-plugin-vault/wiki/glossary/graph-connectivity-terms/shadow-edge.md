---
title: "shadow edge"
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

# shadow edge

## Definition

A `link` that resolves into an excluded scratch folder (`output/`, `_inbox/`) instead of a wiki page. The link looks resolved but lands on a quarantined stub; connectivity flags it as a shadow and does not count it as a connecting edge. The on-disk signature of the stub-shadowing hazard the `_inbox/` quarantine prevents. See ADR-0031.

## Key Principles

- A `link` that resolves into an excluded scratch folder (`output/`, `_inbox/`) instead of a wiki page.
- Canonical term in the claude-wiki-pages **Graph connectivity terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `link`
- `output/`
- `_inbox/`

## Related Concepts

Part of the **Graph connectivity terms** group: Obsidian-accurate link resolution, wikilink collision, connected component, orphan node, node universe, piped wikilink, path-qualified wikilink, strict tree, spine edge, topic path, tag de-cycling, oversaturation.
