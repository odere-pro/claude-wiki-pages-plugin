---
title: "Multi-Vault Registry"
type: concept
aliases: ["Multi-Vault Registry", "multi-vault registry", "vault registry", "settings.json"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[ADR-0009: Multi-Vault Registry]]", "[[ADR-0016: Multi-Vault Registry Fail-Closed]]", "[[Operations Guide]]"]
related: ["[[Vault Resolution]]", "[[Firewall]]", "[[Active Vault]]", "[[Vault Lifecycle]]"]
tags: ["concept", "vault", "registry"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Multi-Vault Registry

## Definition

The multi-vault registry is the managed list of vaults known to the plugin, stored in `.claude/claude-wiki-pages/settings.json`. Exactly one vault is active at a time. The registry is fail-closed: any malformed JSON or invariant violation blocks all writes.

## Key Principles

- **Registry shape:** `default_vault_path`, `current_vault_path`, `vaults: [{path, name}]`.
- **Invariant:** `current_vault_path` must equal exactly one `vaults[].path`. Violation → fail-closed.
- **Progressive disclosure:** `init_vault_settings` creates `settings.json` without the `vaults` key. The `vaults` array is introduced only by the first `vault_add`.
- **Lifecycle commands** (`scripts/set-vault.sh`): `add`, `remove`, `switch`, `list`. `merge` is deferred (ADR-0012).
- **`remove` never deletes data:** deregisters the vault without touching files on disk.
- **Fail-closed:** a fresh or legacy `settings.json` without a `vaults` key is valid; malformed JSON fails closed.

## Examples

```json
{
  "default_vault_path": "docs/vault",
  "current_vault_path": "projects/my-vault",
  "vaults": [
    { "path": "projects/my-vault", "name": "my-vault" }
  ]
}
```

## Related Concepts

- [[Vault Resolution]] — reads `current_vault_path` from this registry
- [[Firewall]] — enforces `cross-vault` deny based on the active vault
- [[Active Vault]] — `current_vault_path` designates this
- [[Vault Lifecycle]] — the `add`/`remove`/`switch`/`list` operations
