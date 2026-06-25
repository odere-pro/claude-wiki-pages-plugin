---
title: "scripts/resolve-vault.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/resolve-vault.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/resolve-vault.sh

## Summary

Sourceable helper (not executable) defining `resolve_vault()`, `init_vault_settings()`, and `set_vault_path()`. Implements the four-tier vault resolution chain used by every hook script in Layer 4. Sourced by all hook scripts for consistent, testable vault resolution.

## Key Claims

Four-tier resolution order: (1) `CLAUDE_WIKI_PAGES_VAULT` env var with path-traversal guard; (2) `.claude/claude-wiki-pages/settings.json` current_vault_path via Bun settings-tool.ts, with grep/sed fallback; (3) auto-detect by scanning up to four directory levels for CLAUDE.md with schema_version plus a wiki/ sibling; (4) default `docs/vault`. PATH is hardened per-invocation (not globally mutated) so hook shells with stripped PATH still find required tools. Also defines `wired_parse_record()` value-object accessor and sources `lib-vault-registry.sh` and `lib-wired-source.sh`.

Covers: Vault Resolution, Four-Tier Resolution, Settings File, Path Hardening, Wired Sources
