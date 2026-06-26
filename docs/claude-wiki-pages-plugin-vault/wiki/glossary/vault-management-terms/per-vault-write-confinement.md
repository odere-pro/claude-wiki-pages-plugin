---
title: "per-vault write confinement"
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

# per-vault write confinement

## Definition

The firewall invariant that agent and tool writes are restricted to the active vault plus its explicit `allowPaths`. Cross-vault writes are blocked. Enforced by `scripts/firewall.sh` and `src/core/firewall.ts`.

## Key Principles

- The firewall invariant that agent and tool writes are restricted to the active vault plus its explicit `allowPaths`.
- Canonical term in the claude-wiki-pages **Vault management terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `allowPaths`
- `scripts/firewall.sh`
- `src/core/firewall.ts`

## Related Concepts

Part of the **Vault management terms** group: active vault, vault registry, vault lifecycle, vault merge, registered vault roots, cross-vault, wired source, project intake.
