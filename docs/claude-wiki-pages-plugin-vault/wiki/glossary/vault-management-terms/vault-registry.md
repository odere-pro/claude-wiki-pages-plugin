---
title: "vault registry"
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

# vault registry

## Definition

The managed list of vaults known to the plugin, stored in `.claude/claude-wiki-pages/settings.json`. Today only `add`, `remove`, `switch`, and `list` are supported; `merge` is deferred — see ADR-0012.

## Key Principles

- The managed list of vaults known to the plugin, stored in `.claude/claude-wiki-pages/settings.json`.
- Canonical term in the claude-wiki-pages **Vault management terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `.claude/claude-wiki-pages/settings.json`
- `add`
- `remove`
- `switch`
- `list`

## Related Concepts

Part of the **Vault management terms** group: active vault, vault lifecycle, vault merge, per-vault write confinement, registered vault roots, cross-vault, wired source, project intake.
