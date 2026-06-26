---
title: "sources"
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

# sources

## Definition

Frontmatter field listing a page's citations. Required on every non-source page. List of `wikilinks` into the sources folder (`_sources/`). Plain strings are a lint error.

## Key Principles

- Frontmatter field listing a page's citations.
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wikilinks`
- `_sources/`

## Related Concepts

Part of the **Schema terms** group: schema, schema version, migrate, frontmatter, type, topic page, project page, source manifest, claim-level provenance, derived claim, vault, example vault.
