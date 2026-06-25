---
title: "Vault Resolution"
type: concept
aliases: ["vault resolution", "vault resolver", "four-tier vault resolution", "resolve-vault.sh"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "vault", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Vault Resolution

The four-tier lookup that every Layer 4 script runs to find which vault directory is currently active, resolving from an explicit environment variable through project settings, auto-detection, and finally a hard default.

## Definition

Vault resolution is the deterministic process implemented in `scripts/resolve-vault.sh` that locates the active vault without requiring the caller to hard-code a path. All Layer 4 scripts source this file as their first step. The resolution is a priority ladder where the first match wins:

1. **`CLAUDE_WIKI_PAGES_VAULT` environment variable** — an explicit override set by the operator or CI. Highest priority; takes precedence over any stored configuration. Useful for local dev or CI pipelines that manage multiple vaults.
2. **`.claude/claude-wiki-pages/settings.json` `current_vault_path` field** — the project-level configuration written by `scripts/set-vault.sh` or created with defaults on first `SessionStart`. Covers the typical case where a project has one designated vault.
3. **Auto-detection** — the script scans up to four directory levels above the current working directory looking for a `CLAUDE.md` file that declares `schema_version` and has a `wiki/` sibling. The first match is used. This allows a user to run any plugin command from anywhere inside a vault without having set up the settings file.
4. **Default** — `docs/vault` relative to the plugin installation directory. The fallback for new installations before any configuration has been set.

## Key Principles

**First match wins, resolution is deterministic.** Given the same environment and filesystem state, every script resolves to the same vault. This makes scripts composable and predictable: a `snapshot.sh pre` call before an ingest run and a `verify-ingest.sh` call afterward both use the same vault without coordination.

**Change the vault via `set-vault.sh`, not by hand.** `scripts/set-vault.sh <path>` writes `current_vault_path` to `.claude/claude-wiki-pages/settings.json`. Editing the JSON by hand is fragile; the script validates the path and writes the canonical form.

**The vault registry tracks multiple vaults.** `.claude/claude-wiki-pages/settings.json` holds `current_vault_path` (the active vault for writes) and the vault registry (the list of known vaults). Only the active vault is ever written to; the firewall enforces this per-vault write confinement.

**Auto-detection is a convenience, not a security boundary.** Auto-detection scans parent directories for a `CLAUDE.md` + `wiki/` pair, but the firewall is the actual write boundary: even if auto-detection picks a vault, the firewall's `allowPaths` and `denyPaths` constrain what can be written inside it.

**`CLAUDE_WIKI_PAGES_VAULT` is the CI override.** In CI or test pipelines that manage multiple vaults (e.g., running against `tests/fixtures/reference-vault`), the environment variable avoids any ambiguity from the settings file or auto-detection.

## Examples

A user runs `/claude-wiki-pages:wiki` from `~/projects/my-project/`. `resolve-vault.sh` checks for `CLAUDE_WIKI_PAGES_VAULT` (not set), then reads `.claude/claude-wiki-pages/settings.json` (has `current_vault_path: "docs/vault"`), and resolves to `~/projects/my-project/docs/vault`. Every subsequent script call in the session uses this path.

A CI job runs `CLAUDE_WIKI_PAGES_VAULT=tests/fixtures/reference-vault bash scripts/verify-ingest.sh`. The environment variable overrides all other tiers; the script validates the reference vault.

## Related Concepts

Vault resolution is implemented by `scripts/resolve-vault.sh` and consumed by all Layer 4 scripts. It is the prerequisite for the firewall (which needs the resolved vault path to build the allow-list), the snapshot (which checkpoints the resolved vault), and the engine (which validates the vault at the resolved path). The vault registry and active vault concepts depend on resolution being correct.
---
