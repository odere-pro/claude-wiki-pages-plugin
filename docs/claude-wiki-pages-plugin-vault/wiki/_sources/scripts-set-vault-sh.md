---
title: "scripts/set-vault.sh"
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

# scripts/set-vault.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/set-vault.sh

## Summary

Manages the active vault path and multi-vault registry in `.claude/claude-wiki-pages/settings.json`. Supports subcommands: add (register without switching), remove (deregister, never deletes data), switch (change active vault), list (print registry), and a legacy bare form that sets current_vault_path directly.

## Key Claims

Sets only current_vault_path; default_vault_path is never changed. Creates settings.json with defaults if absent. Warns non-fatally when a given path does not exist on disk (bare form only). Multi-vault subcommands delegate to registry helpers in lib-vault-registry.sh via resolve-vault.sh.

Covers: Vault Path Management, Multi-Vault Registry, Settings Management
