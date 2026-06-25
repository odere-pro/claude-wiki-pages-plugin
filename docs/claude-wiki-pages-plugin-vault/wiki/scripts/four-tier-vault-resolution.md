---
title: "Four-Tier Vault Resolution"
type: concept
aliases: ["Vault Resolution", "Four-Tier Resolution", "Vault Path Resolution"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-resolve-vault-sh|scripts/resolve-vault.sh]]", "[[scripts-set-vault-sh|scripts/set-vault.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["scripts", "vault-resolution", "settings", "layer-4"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Four-Tier Vault Resolution

A prioritised chain of four methods for locating the active vault, used by every Layer 4 script.

## Definition

Four-Tier Vault Resolution is the algorithm implemented in `resolve_vault()` inside `scripts/resolve-vault.sh`. Every hook script sources this file and calls `resolve_vault()` to determine the vault path consistently. The resolution stops at the first tier that produces a non-empty result.

## Key Principles

The tiers in priority order:

1. **`CLAUDE_WIKI_PAGES_VAULT` env var:** explicit operator or CI override. Path-traversal components (`..`) are rejected with a WARN and the chain falls through to tier 2. The deprecated `LLM_WIKI_VAULT` is still honoured as a fallback within this tier.

2. **Settings file `current_vault_path`:** `.claude/claude-wiki-pages/settings.json` is read via `settings-tool.ts` (Bun) with a grep/sed fallback when Bun is unavailable. A readable settings value always resolves at this tier.

3. **Auto-detect:** scans up to four directory levels for a `CLAUDE.md` containing `schema_version` alongside a `wiki/` sibling directory. Candidates are sorted deterministically; the first match wins.

4. **Default `docs/vault`:** reached only when the settings file is absent or has an empty `current_vault_path`. Not a failure — it is the expected state for a fresh install or when no vault has been explicitly set.

## Examples

A CI pipeline sets `CLAUDE_WIKI_PAGES_VAULT=/workspace/my-vault` and tier 1 resolves immediately. A developer running interactively relies on the settings file set by `set-vault.sh` at tier 2. The onboarding wizard uses auto-detect at tier 3 when it scaffolds a vault in the current project.

## Related Concepts

`set-vault.sh` updates the settings file (tier 2). The TypeScript twin (`src/core/vault.ts`) implements the same logic for the engine. The vault lock (`vault-lock.sh`) prevents concurrent ingest sessions from resolving conflicting vault paths.
