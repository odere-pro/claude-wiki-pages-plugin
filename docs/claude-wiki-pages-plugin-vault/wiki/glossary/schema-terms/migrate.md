---
title: "migrate"
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

# migrate

## Definition

The engine command that upgrades a vault's `schema_version` in place (v1 → v2 → v3; the v2→v3 step is the `rename-index` action — see `folder note`). Additive, idempotent, git-checkpointed. `bash scripts/engine.sh migrate [--write]`.

## Key Principles

- The engine command that upgrades a vault's `schema_version` in place (v1 → v2 → v3; the v2→v3 step is the `rename-index` action — see `folder note`).
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `schema_version`
- `rename-index`
- `folder note`
- `bash scripts/engine.sh migrate [--write]`

## Related Concepts

Part of the **Schema terms** group: schema, schema version, frontmatter, type, sources, topic page, project page, source manifest, claim-level provenance, derived claim, vault, example vault.
