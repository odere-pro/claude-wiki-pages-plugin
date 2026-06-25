---
title: "resolve-vault.sh"
type: entity
entity_type: tool
aliases: ["resolve-vault.sh", "Vault Resolver"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-resolve-vault-sh|scripts/resolve-vault.sh]]"]
related: []
tags: ["scripts", "vault-resolution", "layer-4", "settings"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# resolve-vault.sh

Sourceable bash library that defines the four-tier vault resolution chain used by every Layer 4 hook script.

## Overview

`scripts/resolve-vault.sh` is not executed directly; it is sourced by every other hook script. It defines `resolve_vault()`, `init_vault_settings()`, `set_vault_path()`, and the `wired_parse_record()` value-object accessor. It also sources `lib-vault-registry.sh` and `lib-wired-source.sh` to make registry and wired-source helpers available to all callers.

## Key Facts

- **Tier 1:** `CLAUDE_WIKI_PAGES_VAULT` env var — explicit override; path-traversal (`..`) components are rejected with a WARN and fall-through.
- **Tier 2:** `.claude/claude-wiki-pages/settings.json` → `current_vault_path` field; read via Bun `settings-tool.ts` with a grep/sed degraded fallback when Bun is unavailable.
- **Tier 3:** Auto-detect by scanning up to four directory levels for a `CLAUDE.md` with `schema_version` alongside a `wiki/` sibling directory.
- **Tier 4:** Default `docs/vault`.
- PATH hardening is computed once per-invocation (not mutated globally) so hook shells with stripped PATH still resolve tools like `bun` and `sort`.
- `init_vault_settings()` creates `settings.json` with defaults if absent; used by SessionStart and every hook that resolves the vault.
- `set_vault_path()` uses the Bun settings writer with an awk degraded fallback; M30 fix ensures `&` and `\` characters in vault paths round-trip verbatim.

## Related

Used by every hook script. The four-tier resolution is documented in the plugin root CLAUDE.md under "Vault location".
