---
title: "wired source"
type: concept
aliases: []
parent: "[[vault-management-terms|Vault management terms]]"
path: "glossary/vault-management-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "vault-management-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# wired source

## Definition

A git work tree (typically the host project) registered as a docs-only ingest source via `scripts/wire-source.sh`. Its record (include/exclude globs, `lastSyncedCommit`) lives in `.claude/claude-wiki-pages/settings.json`; `sync` snapshots its changed docs into `raw/wired/<name>/`.

## Key Principles

- A git work tree (typically the host project) registered as a docs-only ingest source via `scripts/wire-source.sh`.
- Canonical term in the claude-wiki-pages **Vault management terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/wire-source.sh`
- `lastSyncedCommit`
- `.claude/claude-wiki-pages/settings.json`
- `sync`
- `raw/wired/<name>/`

## Related Concepts

Part of the **Vault management terms** group: active vault, vault registry, vault lifecycle, vault merge, per-vault write confinement, registered vault roots, cross-vault, project intake.
