---
title: "active vault"
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

# active vault

## Definition

The single vault currently designated for writes. Exactly one vault is active at a time; the firewall enforces write confinement to it. Set via `scripts/set-vault.sh` or the `switch` lifecycle command.

## Key Principles

- The single vault currently designated for writes.
- Canonical term in the claude-wiki-pages **Vault management terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/set-vault.sh`
- `switch`

## Related Concepts

Part of the **Vault management terms** group: vault registry, vault lifecycle, vault merge, per-vault write confinement, registered vault roots, cross-vault, wired source, project intake.
