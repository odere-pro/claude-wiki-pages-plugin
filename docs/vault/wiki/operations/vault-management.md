---
title: "Vault Location Resolution"
type: concept
aliases: ["Vault Location Resolution", "vault location resolution", "vault resolution", "resolve-vault", "Multi-Vault Registry", "multi-vault registry", "Per-Vault Write Confinement", "per-vault write confinement", "firewall", "Firewall"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Operations]]", "[[Glossary]]"]
related: ["[[Installation]]", "[[One Advertised Path]]", "[[Hook-Enforced Safety]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [vault-management, multi-vault, firewall]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Vault Location Resolution

`scripts/resolve-vault.sh` resolves the active vault using a four-tier order (first match wins):

1. **`CLAUDE_WIKI_PAGES_VAULT` env var** — explicit override for local dev / CI.
2. **`.claude/claude-wiki-pages/settings.json`** — `current_vault_path` field.
3. **Auto-detect** — scan up to 4 levels for a `CLAUDE.md` with `schema_version` next to a `wiki/`.
4. **Default** — `docs/vault`.

Switch persistently: `bash scripts/set-vault.sh <path>`. Switch for one session: `CLAUDE_WIKI_PAGES_VAULT=<path> claude`.

---

# Multi-Vault Registry

The vault registry lives in `.claude/claude-wiki-pages/settings.json` and manages N registered vaults with exactly one active at a time.

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

**Invariant**: `current_vault_path` must equal exactly one `vaults[].path`. A malformed registry causes `_vaults_read` to exit non-zero and blocks all writes (fail-closed).

**Progressive disclosure**: a fresh or legacy `settings.json` without a `vaults` key is valid; the array is introduced only by the first `vault_add`.

## Lifecycle Commands (`scripts/set-vault.sh`)

| Command | Effect |
|---|---|
| `set-vault.sh add <path> [name]` | Register a vault without switching |
| `set-vault.sh remove <path\|name>` | Deregister (never deletes data); refuses to remove active vault or last vault |
| `set-vault.sh switch <path\|name>` | Change `current_vault_path` |
| `set-vault.sh list` | Print registry; active vault marked with `*` |

---

# Per-Vault Write Confinement

The firewall invariant that agent and tool writes are restricted to the active vault plus its explicit `allowPaths`. Cross-vault writes are blocked unconditionally.

Implemented by `scripts/firewall.sh` and `src/core/firewall.ts`. Modes: `enforce` / `warn` / `off`.

- **`allowPaths`**: extra write roots permitted beyond the resolved vault.
- **`denyPaths`**: glob patterns that override both the vault root and allowPaths.

The firewall enforces write confinement even for offline operations (`scripts/offline-draft.sh` enforces `_proposed/`-only confinement itself, since hooks do not fire offline).
