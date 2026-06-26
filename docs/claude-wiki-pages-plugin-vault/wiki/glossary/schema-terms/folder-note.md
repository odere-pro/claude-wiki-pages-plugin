---
title: "folder note"
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

# folder note

## Definition

The per-folder index file, named exactly after its folder — `wiki/<topic>/<topic>.md`, `type: index` (schema v3; established Obsidian community term, so existing tooling priors apply). Replaces `_index.md`; a legacy `_index.md` is still accepted but flagged `legacy-index-filename` by verify. The root index is always `wiki/index.md`. See ADR-0022.

## Key Principles

- The per-folder index file, named exactly after its folder — `wiki/<topic>/<topic>.md`, `type: index` (schema v3; established Obsidian community term, so existing tooling priors apply).
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wiki/<topic>/<topic>.md`
- `type: index`
- `_index.md`
- `legacy-index-filename`
- `wiki/index.md`

## Related Concepts

Part of the **Schema terms** group: schema, schema version, migrate, frontmatter, type, sources, topic page, project page, source manifest, claim-level provenance, derived claim, vault.
