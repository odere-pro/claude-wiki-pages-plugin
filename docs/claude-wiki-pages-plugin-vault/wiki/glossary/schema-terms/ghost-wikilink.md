---
title: "ghost wikilink"
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

# ghost wikilink

## Definition

A `link` the plugin's index resolves but Obsidian does not: it matches a page's `title:` or `aliases:` but no filename stem or path. Obsidian resolves a written link by path/basename only, so the link renders as a gray ghost node floating beside the real one. Distinct from a `dangling wikilink` (which matches nothing): a ghost matches the wrong tier. Remedy: rewrite to piped basename form `Display`. Detected by `lint --check ghost-links` (WARN-severity check `wikilink-ghost`), fixed by the curator.

## Key Principles

- A `link` the plugin's index resolves but Obsidian does not: it matches a page's `title:` or `aliases:` but no filename stem or path.
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `link`
- `title:`
- `aliases:`
- `dangling wikilink`
- `Display`

## Related Concepts

Part of the **Schema terms** group: schema, schema version, migrate, frontmatter, type, sources, topic page, project page, source manifest, claim-level provenance, derived claim, vault.
