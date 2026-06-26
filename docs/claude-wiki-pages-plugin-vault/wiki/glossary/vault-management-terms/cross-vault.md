---
title: "cross-vault"
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

# cross-vault

## Definition

Describes any operation that would read from or write to a vault other than the currently active one. Cross-vault writes are unconditionally blocked by the firewall (`scripts/firewall.sh`); cross-vault reads are also prohibited unless explicitly permitted. The confinement rule enforced by `per-vault write confinement`.

## Key Principles

- Describes any operation that would read from or write to a vault other than the currently active one.
- Canonical term in the claude-wiki-pages **Vault management terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `scripts/firewall.sh`
- `per-vault write confinement`

## Related Concepts

Part of the **Vault management terms** group: active vault, vault registry, vault lifecycle, vault merge, per-vault write confinement, registered vault roots, wired source, project intake.
