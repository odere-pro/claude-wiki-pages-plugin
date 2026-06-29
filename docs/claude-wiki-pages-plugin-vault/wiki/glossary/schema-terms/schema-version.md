---
title: "schema version"
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

# schema version

## Definition

Integer version of the schema. Frontmatter field `schema_version`. Current: 3 (v1 and v2 still supported). Mismatch blocks `verify-ingest.sh`. Upgrade in place with `migrate`.

## Key Principles

- Integer version of the schema.
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `schema_version`
- `verify-ingest.sh`
- `migrate`

## Related Concepts

Part of the **Schema terms** group: schema, migrate, frontmatter, type, sources, topic page, project page, source manifest, claim-level provenance, derived claim, vault, example vault.
