---
title: "Vault Resolution"
type: concept
aliases: ["Vault Resolution", "vault resolution", "resolve-vault", "four-tier resolution"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[operations]]", "[[GLOSSARY]]"]
related: ["[[Multi-Vault Registry]]", "[[Hook System]]"]
tags: [operations, vault]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Vault Resolution

All Layer 4 scripts resolve the active vault via `scripts/resolve-vault.sh` using a four-tier order. The first match wins.

## Resolution Order

1. **`CLAUDE_WIKI_PAGES_VAULT` env var** — explicit override for local dev / CI.
2. **`.claude/claude-wiki-pages/settings.json`** — `current_vault_path` field; written by `scripts/set-vault.sh` or created with defaults on first `SessionStart`.
3. **Auto-detect** — scan up to 4 levels for a `CLAUDE.md` with `schema_version` + a `wiki/` sibling.
4. **Default** — `docs/vault`.

## Switching Vaults

- **Persistent switch**: `bash scripts/set-vault.sh <path>` — updates only `current_vault_path`; `default_vault_path` is fixed at `docs/vault` and serves as the reset reference.
- **Session switch**: `CLAUDE_WIKI_PAGES_VAULT=<path> claude` — overrides for the session only.

## The Settings File

`.claude/claude-wiki-pages/settings.json` shape:

```json
{
  "default_vault_path": "docs/vault",
  "current_vault_path": "projects/my-vault",
  "vaults": [
    { "path": "projects/my-vault", "name": "my-vault" }
  ]
}
```

`default_vault_path` is never overwritten by lifecycle commands. `current_vault_path` is the sole active pointer. `vaults` is introduced on first `vault add` — a settings file without `vaults` is valid (tier-4 default-fallback applies).

## Invariant

`current_vault_path` must equal exactly one `vaults[].path`. A registry that violates this is treated as malformed: all writes are blocked (fail-closed) and a stderr warning names the problem.

See [[Multi-Vault Registry]] for the full lifecycle of `add`/`remove`/`switch`/`list`.
