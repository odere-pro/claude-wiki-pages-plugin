---
title: "src/core/vault.ts — Four-Tier Vault Resolution"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "vault-resolution"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/vault.ts — Four-Tier Vault Resolution

## Metadata

- **Source**: `raw/repo/src/core/vault.ts`
- **Type**: TypeScript implementation

## Summary

Faithful TypeScript port of `scripts/resolve-vault.sh`. `resolveVault` is the single sanctioned vault-resolution entry point for all commands. Being imported by 10+ of 14 command modules is an intentional one-X fan-in, not a coupling smell. Resolution order (first match wins): env var, settings file, auto-detect, default.

## Key Claims

- Resolution order: (1) `CLAUDE_WIKI_PAGES_VAULT` env var (or deprecated `LLM_WIKI_VAULT`), (2) `.claude/claude-wiki-pages/settings.json` current_vault_path, (3) auto-detect CLAUDE.md with `schema_version` and `wiki/` sibling (≤4 levels), (4) default `docs/vault`
- `resolveVaultPath()`: canonical "resolve + normalise" helper — applies trailing-slash strip; preferred over inlining the strip in each command
- `autoDetect()`: scans up to 4 levels for CLAUDE.md files, checks for `schema_version` marker and `wiki/` sibling
- `ResolveOptions`: tunable knobs (`cwd`, `env`, `settingsFile`); callers must NOT call lower-level helpers directly
- Stabilised interface (H15 / Architect ruling): forking resolution would create a second source of truth
- Parity twin of `scripts/resolve-vault.sh`; callers should use `resolveVaultPath` not lower helpers
Covers: Four-Tier Vault Resolution, resolveVault, resolveVaultPath, Auto-Detect
