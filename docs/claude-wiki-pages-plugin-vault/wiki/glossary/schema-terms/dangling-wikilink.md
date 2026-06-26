---
title: "dangling wikilink"
type: concept
aliases: []
parent: "[[schema-terms|Schema terms]]"
path: "glossary/schema-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "schema-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# dangling wikilink

## Definition

A `link` whose normalised target (after stripping any `|alias`, `#heading`, and `^block` anchor, then lowercasing) matches no page's filename stem, `title:`, or `aliases:` entry. Renders as an empty grey node in Obsidian's graph. Detected by `verify` (WARN-severity check `wikilink-dangling`, one finding per page/distinct-target pair) and by `scripts/graph-quality.sh`. See ADR-0028.

## Key Principles

- A `link` whose normalised target (after stripping any `|alias`, `#heading`, and `^block` anchor, then lowercasing) matches no page's filename stem, `title:`, or `aliases:` entry.
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `link`
- `|alias`
- `#heading`
- `^block`
- `title:`

## Related Concepts

Part of the **Schema terms** group: schema, schema version, migrate, frontmatter, type, sources, topic page, project page, source manifest, claim-level provenance, derived claim, vault.
