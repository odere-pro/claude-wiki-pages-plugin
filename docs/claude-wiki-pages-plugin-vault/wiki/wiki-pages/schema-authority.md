---
title: "Schema Authority"
type: concept
aliases: ["Schema Authority", "schema authority", "vault schema", "CLAUDE.md"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[_sources/architecture|Architecture Documentation]]", "[[_sources/glossary|Glossary]]", "[[adr-0014-single-source-required-fields|ADR-0014: Single-Source Required Fields]]", "[[llm-wiki-02-create-new-vault|User Guide 02: Create a New Vault]]", "[[knowledge-graph-claude-md|Knowledge Graph Schema (CLAUDE.md)]]", "[[_sources/adr-0029-drop-vault-example|ADR-0029: Drop docs/vault-example]]"]
related: ["[[ingest-pipeline|Ingest Pipeline]]", "[[lint-rules|Lint Rules]]", "[[folder-note|Folder Note]]"]
tags: ["concept", "schema", "authority"]
created: 2026-06-13
updated: 2026-06-15
update_count: 7
status: active
confidence: 1.0
---

# Schema Authority

> [!summary]
> The schema authority is `vault/CLAUDE.md` — the single authoritative source for the vault's frontmatter schema, required fields, hierarchy rules, ingest rules, query rules, lint rules, and Ontology Profile v1. Every skill and agent reads it at the start of every operation. CLAUDE.md wins all conflicts: when any skill's default behavior contradicts these rules, CLAUDE.md takes precedence. The machine-readable `### Required fields by type` table is parsed by `validate-frontmatter.sh` (grep/awk only — no Bun dependency).

## Key Principles

- `vault/CLAUDE.md` is an executable specification, not documentation: the LLM reads it at the start of every operation and its authority is unconditional over skills and agents.
- The `### Required fields by type` table is the machine-readable single source of truth parsed by `validate-frontmatter.sh` using bash/grep/awk (Tier 0, no Bun); changing a required field means editing this table only.
- `entity_type_extensions:` is the sole customization axis for vault owners: it widens `entity_type` with a per-vault allow-list; all other enums are closed.
- The schema lives in markdown rather than a YAML config so the LLM reads it directly, the table is both human-readable and machine-parseable, and the ontology tables work as authoritative prose.
- Skills ship with generic defaults that conflict with the vault schema; CLAUDE.md's skill compatibility overrides section takes precedence.

## Examples

Reading the schema to override a conflicting skill default (from the skill compatibility overrides section):

| Skill expects        | This vault uses    | Rule                                          |
| -------------------- | ------------------ | --------------------------------------------- |
| `wiki/sources/`      | `wiki/_sources/`   | Always use `wiki/_sources/`                   |
| Plain-string sources | wikilink sources   | Always use wikilink syntax in `sources:`      |

Migrating a vault from schema v2 to v3:

```bash
bash scripts/engine.sh migrate --target <vault> --write
# Renames _index.md → <topic>.md and rewrites wikilinks
```

## Definition

`vault/CLAUDE.md` is not documentation — it is an executable specification that the LLM reads and follows. The distinction matters: skills and agents ship with generic defaults (flat directory layouts, minimal frontmatter, plain-string sources). `CLAUDE.md` overrides all of them. Skills provide workflow structure; `CLAUDE.md` provides the schema.

The file is read at the start of every operation. Its authority is unconditional: no skill, agent, or plugin default can override it for the vault it governs.

## What CLAUDE.md Contains

The schema authority file covers:

1. **Schema version** — `schema_version: 3` (current). Each version is a strict superset of the previous; vaults on v1 or v2 remain valid.
2. **Purpose and data layer layout** — what belongs in `raw/`, `wiki/`, `output/`, `_proposed/`.
3. **Frontmatter schema** — the complete type system: `type` values, required fields per type, allowed field values.
4. **`### Required fields by type` table** (ADR-0014) — the machine-readable single source of truth that `validate-frontmatter.sh` parses.
5. **Ontology Profile v1** — two markdown tables: predicate domain→range and enum list.
6. **Ingest rules** — the 13-step [[ingest-pipeline|Ingest Pipeline]].
7. **Query rules** — the 7-step [[query-rules|Query Rules]].
8. **[[lint-rules|Lint Rules]]** — the full check set.
9. **Readability rules** — heading depth cap, at-a-glance block requirement, callout preferences.
10. **Linking conventions** — wikilinks only in prose, typed relationships in frontmatter.
11. **Skill compatibility overrides** — explicit override instructions for skills with generic defaults.
12. **Scaling milestones** — recommendations at 0–50, 50–200, 200–500, 500+ pages.

## Machine-Readable Required Fields (ADR-0014)

The `### Required fields by type` table is the primary interface between the schema authority and the hook system. `scripts/validate-frontmatter.sh` parses this table at write time using grep and awk — no Bun required. This means the required-fields check runs even in fully offline environments where Bun is not installed.

The table is the single source of truth: changing a required field means editing this table only. The hook script derives its check from the table; the two cannot disagree.

```markdown
| Type      | Required fields                                                     | Conditional |
| --------- | ------------------------------------------------------------------- | ----------- |
| `entity`  | `entity_type parent path sources created updated status confidence` | —           |
| `concept` | `parent path sources created updated status confidence`             | —           |

| ...
```

## Skill Compatibility Overrides

Several skills shipped with behaviors that conflict with the vault schema. CLAUDE.md explicitly overrides them:

| Skill expects         | This vault uses                | Rule                                                           |
| --------------------- | ------------------------------ | -------------------------------------------------------------- |
| `wiki/sources/`       | `wiki/_sources/`               | Always use `wiki/_sources/`                                    |
| `wiki/entities/`      | topic folders                  | Place entities in topic folders, not a flat entities directory |
| Plain-string sources  | wikilink sources               | Always use wikilink syntax in `sources:`                       |
| No `parent`/`path`    | Required on all non-root pages | Always set both fields                                         |
| No `type` field       | Required on every page         | Always include `type`                                          |
| No aliases on indexes | Required                       | Add topic name variants                                        |

When running `/claude-wiki-pages:ingest`, the agent follows the 13-step rules in CLAUDE.md, not the skill's simpler defaults. When running `/claude-wiki-pages:lint`, the agent checks everything the skill checks plus the additional rules in CLAUDE.md.

## Schema Version History

| Version | Changes                                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1      | Base schema: `source`, `entity`, `concept`, `synthesis`, `index` types; `sources`, `parent`, `path`, `confidence` fields                                                                     |
| v2      | Added: `topic`, `project`, `manifest` types; `source_quotes`, `derived` optional fields; source manifest (`wiki/_sources/manifest.md`); `_proposed/` staging area                            |
| v3      | Changed: per-folder index is now a **folder note** named after its folder (`wiki/<topic>/<topic>.md`) instead of `_index.md`; `parent`/`children`/`child_indexes` wikilink form is normative |

Vaults on v1 or v2 remain valid — each version is a strict superset. Upgrade with:

```bash
bash scripts/engine.sh migrate --target <vault> --write
```

The `migrate` verb renames `_index.md` files to folder-note names and rewrites the wikilinks that pointed at them.

## Customization

`CLAUDE.md` is the customization point for the vault — edit it, not the skills. The supported customization:

- `entity_type_extensions:` — the only field vault owners can widen. Add custom entity types here; the legal set is then core ∪ extensions at read time.
- All other enums are closed (adding a `type` value requires a new ADR).
- Adjust confidence calibration notes or readability rules as needed for your domain.

Skills ship with generic defaults; override them here, not by forking the skill.

## Why CLAUDE.md, Not a YAML Config

The schema lives in a markdown file rather than a structured config file for three reasons:

1. **The LLM reads it directly.** The LLM reads CLAUDE.md at the start of every operation. A YAML schema would require the LLM to parse the schema in a separate step — adding indirection and failure modes.
2. **The required-fields table is both human-readable and machine-parseable.** `validate-frontmatter.sh` parses the markdown table with grep/awk; humans read it as a table. No translation step.
3. **The Ontology Profile v1 tables are authoritative prose.** The instruction "read these two tables and no other source" works in a human-readable file; it would be awkward in a pure config schema.

## Consolidated Home After ADR-0029

ADR-0029 deleted `docs/vault-example/` and established `skills/init/template/CLAUDE.md` as the **one** schema home. Previously, `vault-example/CLAUDE.md` and its `_templates/` were byte-identical duplicates of the shipped template, kept in sync only by a parity gate.

After ADR-0029:
- `validate-frontmatter.sh`, `validate-docs.sh`, and the eval harness all read `skills/init/template/CLAUDE.md` directly.
- Golden/parity/lint tests target `tests/fixtures/reference-vault/` — a small, schema-v3, deliberately clean vault. Its `CLAUDE.md` is pinned to the template by `ontology-profile.bats`.
- The Golden Set moves from `docs/vault-example/` to `tests/fixtures/reference-vault/`.

## Related Concepts

- Ontology Profile v1 — the named ontology block within this file
- [[lint-rules|Lint Rules]] — the checks this file defines
- [[ingest-pipeline|Ingest Pipeline]] — follows the 13-step rules in this file
- Hook System — `validate-frontmatter.sh` parses the required-fields table from this file
- [[folder-note|Folder Note]] — the schema for per-folder index files defined in this file
- Golden Set — the reference vault that exercises the schema (now at `tests/fixtures/reference-vault/`)
- Parity Gate — `ontology-profile.bats` pins fixture↔template after ADR-0029
