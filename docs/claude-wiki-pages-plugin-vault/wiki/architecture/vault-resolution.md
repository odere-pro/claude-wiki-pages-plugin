---
title: "Vault Resolution"
type: concept
aliases: ["Vault Resolution", "vault resolution", "resolve-vault"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Operations Guide]]", "[[Design: Claude Config and Security]]"]
related: ["[[Firewall]]", "[[Multi-Vault Registry]]", "[[Active Vault]]"]
tags: ["concept", "vault"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Vault Resolution

## Definition

Vault resolution is the 4-tier process by which `scripts/resolve-vault.sh` determines the active vault for every operation. First match wins.

## Key Principles

1. **`CLAUDE_WIKI_PAGES_VAULT` env var** — explicit override for local dev / CI.
2. **`settings.json` `current_vault_path`** — the managed registry pointer; written by `set-vault.sh`.
3. **Auto-detect** — scan up to 4 levels for a `CLAUDE.md` with `schema_version` next to a `wiki/` sibling.
4. **Default** — `docs/vault` (the factory default, never overwritten by lifecycle commands).

## Examples

- Switch persistently: `bash scripts/set-vault.sh switch <path>`.
- Switch for one session: `CLAUDE_WIKI_PAGES_VAULT=<path> claude`.
- Auto-detect: useful in contributor sessions inside the plugin repo — finds `docs/vault-example/`.

## Related Concepts

- [[Firewall]] — confines writes to the resolved vault
- [[Multi-Vault Registry]] — the registry that `current_vault_path` lives in
- [[Active Vault]] — the single vault currently designated for writes
