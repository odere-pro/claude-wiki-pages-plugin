---
title: "Vault Resolution"
type: concept
aliases: ["vault-resolution", "Four-Tier Resolution", "resolveVault"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-vault|src/core/vault.ts — Four-Tier Vault Resolution]]"]
related: []
tags: ["src", "core", "vault-resolution", "configuration"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Vault Resolution

The mechanism by which the engine discovers which vault to operate on. `resolveVault` is the SINGLE sanctioned entry point for all commands — an intentional one-X fan-in.

## Definition

Four-tier vault resolution determines the active vault path from environment, settings, file system, or a fixed default. The TypeScript implementation is the parity twin of `scripts/resolve-vault.sh`.

## Key Principles

**Resolution order (first match wins):**

1. `CLAUDE_WIKI_PAGES_VAULT` env var (or deprecated `LLM_WIKI_VAULT`)
2. `.claude/claude-wiki-pages/settings.json` — `current_vault_path` field
3. Auto-detect: scan up to 4 levels for a `CLAUDE.md` declaring `schema_version` with a `wiki/` sibling
4. Default: `docs/vault`

**`resolveVaultPath(opts)`**: the canonical "resolve + normalise" helper. Applies trailing-slash strip. All 11+ command call-sites should use this helper so future normalisation changes are a one-line edit.

**H15 / Architect ruling**: `resolveVault` is the SINGLE sanctioned entry point. Importing 10+ of 14 command modules is intentional one-X fan-in, not a coupling smell. Forking resolution would create a second source of truth.

**`ResolveOptions`**: `cwd`, `env`, `settingsFile`. Callers MUST NOT call lower-level helpers (`readCurrentVaultPath`, `autoDetect`, `findClaudeMds`) directly.

## Examples

- Auto-detect walks up to 4 levels, finds `CLAUDE.md` files, checks for `schema_version` marker and `wiki/` sibling
- `settingsFile` override enables deterministic testing without environment side effects
- Trailing slash stripped: `/my/vault/` → `/my/vault`

## Related Concepts

- `resolveVault` is the parity twin of `scripts/resolve-vault.sh`
- Used by every command handler as the first step in vault path resolution
- `set-vault.sh` writes `current_vault_path` into the settings file (tier 2)
