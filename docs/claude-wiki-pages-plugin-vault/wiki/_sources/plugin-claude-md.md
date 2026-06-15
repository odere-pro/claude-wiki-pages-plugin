---
title: "Plugin CLAUDE.md"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["plugin", "schema", "architecture"]
aliases: ["Plugin CLAUDE.md", "plugin-claude-md", "plugin repo instructions"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Plugin CLAUDE.md

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The root `CLAUDE.md` for the plugin repository itself (not the vault schema). Describes the four-layer stack table, vault location resolution (four-tier: env var → settings.json → auto-detect → default `docs/vault`), the dev-time vs runtime boundary (only `skills/`, `agents/`, `hooks/`, `scripts/`, and `rules/` ship at install), and local development workflows. Also covers the schema_version 2 authority at `docs/vault-example/CLAUDE.md`.

## Key Claims

- `docs/architecture.md` is the architecture authority; `docs/GLOSSARY.md` is the canonical term list; `docs/vault-example/CLAUDE.md` is the schema authority.
- Vault resolution is four-tier; `scripts/resolve-vault.sh` implements it.
- The plugin loads only `skills/`, `agents/`, `hooks/hooks.json`, `scripts/`, and `rules/` at install — everything else (docs, tests, CHANGELOG, this root CLAUDE.md) is in the plugin cache but not session context.
- On onboarding, `docs/vault-example/` is copied to `docs/vault/` (or CLAUDE_WIKI_PAGES_VAULT path); that copy's CLAUDE.md takes over schema authority.
- The `fill-gaps` command and ADR-0020 scaffolding ablation are listed in the Layer 4 table.

## Entities Mentioned

- [[claude-wiki-pages (Plugin)]]
- [[Vault Resolution]]

## Concepts Covered

- [[Four-Layer Stack]]
- [[Plugin Dev-Time vs Runtime]]
- [[Schema Authority]]

## Grounded Pages

Wiki pages that cite this source:

- [[Four-Layer Stack]] — four-layer model described here
- [[Plugin Dev-Time vs Runtime]] — dev/runtime install boundary
- [[Vault Resolution]] — four-tier resolution contract
- [[Schema Authority]] — schema authority chain (vault CLAUDE.md wins)
