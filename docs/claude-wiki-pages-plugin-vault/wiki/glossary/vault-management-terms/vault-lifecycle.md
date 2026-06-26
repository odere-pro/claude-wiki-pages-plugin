---
title: "vault lifecycle"
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

# vault lifecycle

## Definition

The set of operations that govern a vault's membership in the registry: `add` (register), `remove` (deregister), `switch` (change the active vault), and `list`. `merge` is a design-accepted but deferred operation — see ADR-0012.

## Key Principles

- The set of operations that govern a vault's membership in the registry: `add` (register), `remove` (deregister), `switch` (change the active vault), and `list`.
- Canonical term in the claude-wiki-pages **Vault management terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `add`
- `remove`
- `switch`
- `list`
- `merge`

## Related Concepts

Part of the **Vault management terms** group: active vault, vault registry, vault merge, per-vault write confinement, registered vault roots, cross-vault, wired source, project intake.
