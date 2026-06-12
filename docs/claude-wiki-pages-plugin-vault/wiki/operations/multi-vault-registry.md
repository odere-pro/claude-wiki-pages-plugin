---
title: "Multi-Vault Registry"
type: concept
aliases: ["Multi-Vault Registry", "multi-vault registry", "vault registry", "multi-vault"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[operations]]", "[[GLOSSARY]]"]
related: ["[[Vault Resolution]]", "[[Operations Guide]]"]
depends_on: ["[[Vault Resolution]]"]
tags: [operations, vault, multi-vault]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Multi-Vault Registry

The vault registry (ADR-0009) manages N registered vaults with exactly one active at a time. One active vault is the hard invariant — the firewall enforces write confinement to the active vault.

## Registry Shape

```json
{
  "default_vault_path": "docs/vault",
  "current_vault_path": "projects/my-vault",
  "vaults": [
    { "path": "projects/my-vault", "name": "my-vault" },
    { "path": "projects/archive", "name": "archive" }
  ]
}
```

`current_vault_path` is the **sole** active pointer. There is no second "active" flag — the active vault is derived as the registry entry whose `path` equals `current_vault_path`.

## Lifecycle Commands (`scripts/set-vault.sh`)

| Command | Effect |
| --- | --- |
| `set-vault.sh add <path> [name]` | Register a vault without switching |
| `set-vault.sh remove <path\|name>` | Deregister (never deletes data on disk). Refuses if active or if it would empty the registry. |
| `set-vault.sh switch <path\|name>` | Change `current_vault_path` to a registered vault |
| `set-vault.sh list` | Print the registry; active vault marked with `*` |

## Cross-Vault Write Confinement

The `cross-vault` firewall rule (added in ADR-0009) blocks writes to any inactive registered vault even if `allowPaths` is permissive. The precedence is: deny → cross-vault → vault → allowPaths → outside-vault. A sibling vault is blocked with a dedicated reason, not the catch-all `outside-vault` rule.

## Vault Merge

Vault merge (consolidating two vaults into one) is design-accepted but implementation-deferred (ADR-0012). The design: two-pass dedup by `sources` and title, `_proposed/` channel for human review of collisions, git checkpointed throughout. No code yet.
