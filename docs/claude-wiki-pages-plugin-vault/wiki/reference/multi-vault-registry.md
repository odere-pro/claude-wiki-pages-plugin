---
title: "Multi-Vault Registry"
type: concept
aliases: ["Multi-Vault Registry", "multi-vault registry", "vault registry", "settings.json"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement]]", "[[ADR-0012: Vault Merge Conflict Resolution]]", "[[ADR-0016: Simultaneous Multi-Vault Management]]", "[[Operations Guide]]", "[[Wiki Pages Skill (maintain-contract SKILL.md)]]"]
related: ["[[Vault Resolution]]", "[[Firewall]]", "[[Active Vault]]", "[[Hook System]]", "[[Multi-Vault Operating Rules]]"]
tags: ["concept", "vault", "registry"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Multi-Vault Registry

> [!summary]
> The multi-vault registry is the managed list of vaults known to the plugin, stored in `.claude/claude-wiki-pages/settings.json`. Exactly one vault is active at a time, pointed to by `current_vault_path`. The registry fails closed: a malformed JSON file or a violated invariant (where `current_vault_path` does not match any `vaults[].path`) blocks all writes. The [[Firewall]] uses the registry to enforce the `cross-vault` deny rule — a write to any inactive registered vault is blocked even if `allowPaths` is permissive.

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

| Field | Role |
| --- | --- |
| `default_vault_path` | Factory default; never overwritten by lifecycle commands; the reset reference |
| `current_vault_path` | **Sole active pointer**; read by `resolve_vault()` |
| `vaults` | Array of `{ path, name }` objects; all registered vaults |

`current_vault_path` is the single source of truth for which vault is active. The active vault is derived as the registry entry whose `path` equals `current_vault_path` — there is no separate "active" flag. This DRY design ensures there is never a disagreement between two sources of truth.

## The Core Invariant

`current_vault_path` must equal exactly one `vaults[].path`. A registry that violates this invariant is treated as malformed: `_vaults_read` exits non-zero, all writes are blocked (fail-closed), and a stderr warning names the problem.

This invariant is enforced by `scripts/set-vault.sh`: the `switch` command updates `current_vault_path` and verifies the result; the `remove` command refuses to remove the active vault or the last registered vault.

## Progressive Disclosure

The `init_vault_settings` function (called on first `SessionStart`) creates `settings.json` without the `vaults` key:

```json
{
  "default_vault_path": "docs/vault",
  "current_vault_path": "docs/vault"
}
```

A `settings.json` without the `vaults` key is valid. The `vaults` array is introduced only by the first `vault_add`. This ensures that existing single-vault installs remain valid without a migration step.

## Lifecycle Commands (`scripts/set-vault.sh`)

| Command | Effect |
| --- | --- |
| `set-vault.sh add <path> [name]` | Register a vault without switching; idempotent |
| `set-vault.sh remove <path|name>` | Deregister only — never deletes data on disk. Refuses if it would remove the active vault or the last registered vault |
| `set-vault.sh switch <path|name>` | Change `current_vault_path` to a registered vault |
| `set-vault.sh list` | Print the registry; active vault marked with `*` |

`remove` edits only the `settings.json` registry entry. The vault's directory, git history, and `raw/`/`wiki/` data are untouched. Re-`add`ing the path restores full registration.

`merge` is explicitly **not** in the lifecycle command set — it is deferred to a future ADR (ADR-0012) due to the complexity of vault merge conflict resolution.

## Cross-Vault Deny Rule (ADR-0009)

The [[Firewall]] reads the registry to derive `otherVaults` — all registered vault paths minus the active one. Any write whose target path falls under any `otherVaults` root is denied with `matchedRule: "cross-vault"`.

The `cross-vault` rule sits at higher priority than `allowPaths` in the firewall's rule order:

```
deny → cross-vault → vault (allow) → allowPaths → denyPaths → outside-vault
```

This means: even if `allowPaths` is broad enough to cover a sibling vault's path, the `cross-vault` rule fires first and blocks the write. This is the "allow-proof" property — the block cannot be accidentally overridden by a permissive allow-list entry.

Before this rule (pre-ADR-0009), sibling vault writes were caught only by the catch-all `outside-vault` rule, which can be overridden by `allowPaths`. The dedicated `cross-vault` rule closes that gap.

## Symlink Hardening

Both firewall twins (bash + TypeScript) canonicalise paths before comparison. The bash twin uses `cd "$dir" && pwd -P` (physical realpath); the TypeScript twin uses `fs.realpathSync()`. A symlink from inside the active vault pointing into a sibling vault is caught as a `cross-vault` violation, not silently allowed.

The gate-11 test matrix includes a symlink fixture row that asserts both twins agree on this case.

## Fail-Closed Behavior

| Error condition | Result |
| --- | --- |
| `settings.json` missing | Vault resolution falls to Tier 3 (auto-detect) or Tier 4 (default) |
| `settings.json` malformed JSON | `_vaults_read` exits non-zero; all writes blocked |
| `current_vault_path` not in `vaults[]` | `_vaults_read` exits non-zero; all writes blocked |
| Registry read error (permissions, etc.) | `_vaults_read` exits non-zero; all writes blocked |

Fail-closed means: when in doubt, block rather than guess. The safe default is "no write, surface the error."

## Reading the Registry

No external agent or LLM should read `settings.json` directly. Use `scripts/set-vault.sh list` to see the current registry state. Use `bash scripts/engine.sh firewall --target <vault> --path <p>` to test whether a specific path would be allowed or denied under the current active vault.

## Related

- [[Vault Resolution]] — reads `current_vault_path` from this registry; Tier 2 in the 4-tier order
- [[Firewall]] — uses `otherVaults` derived from this registry for `cross-vault` deny
- [[Active Vault]] — `current_vault_path` designates the one writable vault
- [[Hook System]] — the `firewall.sh` PreToolUse hook reads the registry on every write
