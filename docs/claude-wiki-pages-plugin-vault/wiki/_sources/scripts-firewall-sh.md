---
title: "scripts/firewall.sh"
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

# scripts/firewall.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/firewall.sh

## Summary

PreToolUse hook that confines Write/Edit operations to the resolved vault (plus configured allowPaths), excluding denyPaths and sibling registered vaults. After the Phase 3 firewall-twin-retire, the decision authority moved entirely to the Bun engine (`src/core/firewall.ts`). This script is now a thin stdin-to-engine wrapper that computes OTHER_VAULTS and passes them to the engine.

## Key Claims

Fail-closed on missing Bun: when Bun is absent the hook blocks the write with an install-Bun reason rather than letting an unvalidated write through. Supports a CLI mode (`--file`, `--json`) for tests. Cross-vault confinement is derived from the registry (vaults[] minus current_vault_path), fail-closed on registry read error.

Covers: Write-Path Firewall, Cross-Vault Confinement, Fail-Closed Security
