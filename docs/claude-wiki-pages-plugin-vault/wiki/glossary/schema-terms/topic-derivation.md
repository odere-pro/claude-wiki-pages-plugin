---
title: "topic derivation"
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

# topic derivation

## Definition

Computing a vault's topics (a.k.a. clusters) from its own top-level `wiki/` folders rather than a hardcoded list, so the graph machinery works on any project. The single source of truth is `deriveTopics` in `src/core/topics.ts`, shared by `graph-quality`, `strict-tree-reduce`, and `heal-orphan-sources`; the special scaffolding folders (`_sources`, `_synthesis`, `_proposed`, `_inbox`, `_templates`) are excluded.

## Key Principles

- Computing a vault's topics (a.k.a.
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wiki/`
- `deriveTopics`
- `src/core/topics.ts`
- `graph-quality`
- `strict-tree-reduce`

## Related Concepts

Part of the **Schema terms** group: schema, schema version, migrate, frontmatter, type, sources, topic page, project page, source manifest, claim-level provenance, derived claim, vault.
