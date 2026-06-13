---
title: "Active Vault"
type: concept
aliases: ["Active Vault", "active vault", "current vault", "current_vault_path"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement]]", "[[ADR-0016: Simultaneous Multi-Vault Management]]", "[[Vault Resolution]]"]
related: ["[[Multi-Vault Registry]]", "[[Vault Lifecycle]]", "[[Firewall]]", "[[Vault Resolution]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "vault", "multi-vault"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Active Vault

> [!summary]
> The active vault is the single vault that the plugin's [[Firewall]] and all agent write operations target at any given time. It is identified by the `current_vault_path` field in `.claude/claude-wiki-pages/settings.json`. Exactly one vault is active at a time. All write operations are confined to this vault; cross-vault writes are blocked at the firewall layer.

## Definition

The claude-wiki-pages plugin supports multiple vaults registered in a single settings file, but only one vault is active at a time. The active vault is the target of all plugin write operations — ingest, heal, optimize, synthesize, draft approval — as well as the read target for all query and search operations.

The active vault is identified by `current_vault_path` in `.claude/claude-wiki-pages/settings.json`:

```json
{
  "current_vault_path": "/path/to/my/vault",
  "vaults": [
    { "path": "/path/to/my/vault", "label": "primary" },
    { "path": "/path/to/second/vault", "label": "secondary" }
  ]
}
```

The invariant (enforced by ADR-0016): `current_vault_path` must equal exactly one `vaults[].path`. A settings file where this invariant is violated causes the registry to fail closed — all writes are blocked until the invariant is restored.

## Switching the Active Vault

```bash
bash scripts/set-vault.sh /path/to/second/vault
```

`set-vault.sh` updates only `current_vault_path`. It does not move any files, merge any content, or alter the vault at the new path. The new active vault is available immediately after the switch.

## Write Confinement

The [[Firewall]] (`scripts/firewall.sh` and its TypeScript twin `src/core/firewall.ts`) enforces that no write operation targets a path outside the active vault. The check order is:

1. **`cross-vault` deny** — any write to a path inside a registered vault that is not the active vault is blocked with exit 1.
2. **`allowPaths`** — writes within the active vault are allowed only to paths on the allow-list (typically `wiki/`, `raw/agent-sessions/`, and `_proposed/`).

Cross-vault deny runs before the allowPaths check, so a write that targets a registered-but-inactive vault cannot be granted by allowPaths even if the path is otherwise allowed.

## Registry Fail-Closed (ADR-0016)

ADR-0016 introduced strict fail-closed behavior on the registry:

- Malformed JSON in `settings.json` → `_vaults_read` exits non-zero → all writes blocked.
- `current_vault_path` not in `vaults[]` → invariant violation → all writes blocked.
- A fresh `settings.json` without a `vaults` key is valid (progressive disclosure): the first `vault_add` introduces the `vaults` array.

A read-time audit roll-up surfaces any violation at session start so the user knows immediately.

## Related Concepts

- [[Multi-Vault Registry]] — the settings.json structure and lifecycle commands
- [[Vault Lifecycle]] — init, add, switch, remove, merge lifecycle operations
- [[Firewall]] — the enforcement mechanism for cross-vault deny and allowPaths
- [[Vault Resolution]] — the 4-tier resolver that determines the active vault from environment, settings, auto-detect, and default
