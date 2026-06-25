---
title: "Schema Version"
type: concept
aliases: ["schema_version", "schema version", "vault schema versioning", "schema migration"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["docs", "schema", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Schema Version

An integer declared in `vault/CLAUDE.md` that identifies which version of the vault's frontmatter rules and structural conventions are in force; a mismatch between a page's schema and the vault's declared version blocks `verify-ingest.sh`.

## Definition

`schema_version` is a required frontmatter field in `vault/CLAUDE.md`. Its value is an integer that serves as the authority identifier for the vault's structural rules. Any skill, agent, or script that reads the vault checks this field first; if the declared version is not supported, the operation aborts with a clear migration message rather than silently applying the wrong rules.

Three versions exist:

- **v1** — baseline: `source`, `entity`, `concept`, `synthesis`, `index`, `log` page types; flat `sources/` and `entities/` directories (deprecated layout).
- **v2** — adds `topic`, `project`, `manifest` page types; adds optional claim-level provenance fields `source_quotes` and `derived`; introduces the `_proposed/` staging area.
- **v3** (current) — changes only the per-folder index convention: the index file is a folder note named after its folder (`wiki/<topic>/<topic>.md`) instead of `_index.md`; the `"[[wikilink]]"` form for `parent:`, `children:`, and `child_indexes:` is normative.

Every version is a strict superset of the previous one: v2 vaults are valid v3 vaults with legacy index filenames; v1 vaults are valid with both the old directory layout (deprecated) and legacy index filenames.

## Key Principles

**Single source of truth in `CLAUDE.md`.** The `schema_version` field in the vault's `CLAUDE.md` is the only place the version is declared. Scripts and the engine read it from that file; no parallel version file exists.

**Mismatch is a hard block.** `verify-ingest.sh` checks `schema_version` at the start of every run. If the vault declares a version the script does not support, it exits non-zero with a clear message naming the current and expected versions. This prevents schema drift from silently corrupting pages.

**Additive, idempotent migration.** The `engine migrate --write` command upgrades a vault in place, one version step at a time. The v2→v3 migration's primary action is `rename-index`: it renames each `_index.md` to `<folder>.md` (the folder note name) and rewrites every wikilink that pointed to the old name. The migration is idempotent: running it twice produces the same result. It is git-checkpointed: the migration commits after each step, so a failed mid-migration is revertible.

**Backward compatibility.** Older versions remain valid: a v1 vault runs on a v3-aware engine (the engine reads v1 structure and applies v1 rules). The upgrade is voluntary; the engine recommends `migrate` when it detects a legacy structure but does not force it.

**`schema_version: 3` is required for new vaults.** The onboarding wizard scaffolds new vaults with `schema_version: 3` and the folder-note convention. There is no reason to start at v1 or v2.

## Examples

A vault at `schema_version: 2` with a `wiki/agents/_index.md` file runs `engine migrate --write`. The migration renames `_index.md` to `agents.md`, updates every `[[_index]]` and `[[agents/_index]]` wikilink in the vault to `[[agents|Agents]]`, and commits the result. The vault is now at `schema_version: 3`.

Running `verify-ingest.sh` on a vault that declares `schema_version: 4` (hypothetical future version) against a v3-aware script produces the error: `schema_version mismatch: vault declares 4, this tool supports up to 3` and exits non-zero.

## Related Concepts

Schema version governs the `migrate` command, the `verify-ingest.sh` gate, and every agent or skill that reads the vault. It is declared in `vault/CLAUDE.md` (the vault schema), which is the authoritative schema for all operations. The folder note convention (introduced in v3) and the `_index.md` legacy-index-filename lint check (also v3) depend on the schema version being correctly declared.
---
