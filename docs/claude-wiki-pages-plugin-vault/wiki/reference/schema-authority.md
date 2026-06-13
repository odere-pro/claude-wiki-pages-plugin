---
title: "Schema Authority"
type: concept
aliases: ["Schema Authority", "schema authority", "vault schema", "CLAUDE.md"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[Architecture Documentation]]", "[[Glossary]]", "[[ADR-0014: Single-Source Required Fields]]", "[[User Guide 02: Create a New Vault]]"]
related: ["[[Ontology Profile v1]]", "[[Required Fields]]", "[[Frontmatter Validation]]", "[[Ingest Pipeline]]"]
tags: ["concept", "schema", "authority"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Schema Authority

## Definition

The schema authority is `vault/CLAUDE.md` — the single authoritative source for the vault's frontmatter schema, required fields, hierarchy rules, ingest rules, query rules, lint rules, and ontology profile. Every skill and agent reads it at the start of every operation and defers to it.

## Key Principles

- **CLAUDE.md wins all conflicts.** Skills ship with generic defaults; this file overrides them all.
- **Machine-readable required-fields table** (ADR-0014): the `### Required fields by type` table in `CLAUDE.md` is parsed by `validate-frontmatter.sh` (grep/awk only — no Bun dependency).
- **Ontology profile** is the named `ontology-profile-v1` block — no parallel file, no fork.
- **schema_version: 3** is the current schema. v1 and v2 vaults remain valid (each version is a strict superset). Upgrade with `bash scripts/engine.sh migrate --write`.
- **Customization:** edit `CLAUDE.md`, not the skills. `entity_type_extensions:` is the only field owners can widen; all other enums are closed.

## Examples

A skill may default to `wiki/entities/` for entity pages; `CLAUDE.md` overrides this to topic folders (`wiki/<topic>/`). The skill provides workflow structure; `CLAUDE.md` provides schema.

## Related Concepts

- [[Ontology Profile v1]] — the named ontology block within this file
- [[Required Fields]] — the machine-readable table parsed by validate-frontmatter.sh
- [[Frontmatter Validation]] — `validate-frontmatter.sh` that enforces this file
- [[Ingest Pipeline]] — follows the 13-step rules in this file
