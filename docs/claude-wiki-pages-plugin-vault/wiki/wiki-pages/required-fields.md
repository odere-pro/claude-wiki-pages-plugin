---
title: "Required Fields"
type: concept
aliases: ["Required Fields", "required fields", "required frontmatter", "per-type required fields", "frontmatter requirements"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[adr-0014-single-source-required-fields|ADR-0014: Single-Source Required Fields]]"]
related: ["[[schema-authority|Schema Authority]]", "[[frontmatter-validation|Frontmatter Validation]]", "[[lint-rules|Lint Rules]]", "[[glossary-terms|Glossary Terms]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "reference", "schema", "frontmatter"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Required Fields

> [!summary]
> Required fields are the YAML frontmatter fields that every page of a given type must include. They are defined in a machine-readable table in `vault/CLAUDE.md` under `### Required fields by type`. This table is the single source of truth — `scripts/validate-frontmatter.sh` parses it with grep/awk to enforce it without Bun. Two fields (`type` and `title`) are universal to all types and not repeated in the table.

## Key Principles

- The required-fields table in `vault/CLAUDE.md` is the single source of truth — changing a required field means editing the table only; no secondary list exists.
- `type` and `title` are the two universal required fields on every typed page and are not repeated per-type in the table.
- `scripts/validate-frontmatter.sh` parses the table at write time using bash/grep/awk (Tier 0, no Bun) — the same source humans read is the source machines validate against.
- Missing required fields are the most common source of `missing-field` lint errors; the most critical omission is `sources` — a page with no source link breaks provenance.
- Conditional fields (`attachment_path`, `extracted_at`) are required only when `source_format != text`.

## Examples

A `concept` page missing the `parent` field — blocked by the PreToolUse hook:

```bash
# validate-frontmatter.sh fires on write:
# ERROR: missing-field: parent [wiki/engine/fail-closed.md:3]
# Exit 2 — write blocked
```

The minimum required set for a `concept` page:

```yaml
type: concept
title: "Fail Closed"
parent: "[[engine|Wiki Engine]]"
path: "engine"
sources: ["[[_sources/architecture|Architecture Documentation]]"]
created: 2026-06-14
updated: 2026-06-14
status: active
confidence: 0.9
```

## Definition

Every typed wiki page must carry the fields listed for its type in the required-fields table (ADR-0014). The table is authoritative: changing a required field means editing the table in `CLAUDE.md`, and only the table. No other file maintains a duplicate list of required fields.

The two universal fields:

- `type` — which type of page (source, entity, concept, topic, project, synthesis, index, manifest, log)
- `title` — the human-readable page title; must also be the first entry in `aliases`

Per-type required fields beyond the universal two:

| Type        | Required fields                                                                  |
| ----------- | -------------------------------------------------------------------------------- |
| `source`    | `source_type sources created updated status confidence`                          |
| `entity`    | `entity_type parent path sources created updated status confidence`              |
| `concept`   | `parent path sources created updated status confidence`                          |
| `topic`     | `summary parent path sources created updated status confidence`                  |
| `project`   | `objective project_status parent path sources created updated status confidence` |
| `synthesis` | `synthesis_type sources created updated status confidence`                       |
| `index`     | `aliases created updated`                                                        |
| `manifest`  | `created updated`                                                                |
| `log`       | `created updated`                                                                |

## Machine-Readable Enforcement

`scripts/validate-frontmatter.sh` parses the `### Required fields by type` markdown table in `CLAUDE.md` using grep and awk — no Bun, no JSON schema, no external tool. This keeps the validation in Tier 0 (runs in any environment). The gate extracts the field names from the table and checks each page's frontmatter against them.

The design rationale (ADR-0014): keeping required fields in a single human-readable table means humans reading the schema and machines validating pages are reading the same source. There is no separate JSON schema to keep in sync with the markdown.

## Conditional Fields

Some fields are required only when certain conditions are met:

- `source_format != text` → `attachment_path` and `extracted_at` are required on `source` pages
- `source_format: pdf` or `image` → `attachment_path` must point to a real file under `vault/raw/assets/`

Conditional fields are listed in the "Conditional" column of the required-fields table.

## Common Validation Findings

Pages with missing required fields produce `missing-field` findings in `verify-ingest.sh` output. The most common:

- `entity` or `concept` pages missing `parent` — usually from pages created without following the template
- `source` pages missing `confidence` — often omitted when adding quick source summaries
- `concept` or `entity` pages missing `sources` — the most critical omission; a page with no source link breaks provenance

## Related Concepts

- [[schema-authority|Schema Authority]] — `vault/CLAUDE.md` as the single source of truth for required fields and all other schema rules
- [[frontmatter-validation|Frontmatter Validation]] — the validation script (`validate-frontmatter.sh`) that checks required fields
- [[lint-rules|Lint Rules]] — the broader set of lint checks; required-field checking is one of the structural checks
- [[glossary-terms|Glossary Terms]] — where terminology used in the required-fields table is defined
