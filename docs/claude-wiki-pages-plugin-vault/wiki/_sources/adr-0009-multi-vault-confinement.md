---
title: "ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "vault", "firewall", "multi-vault"]
aliases: ["ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement

## Summary

Establishes the vault registry in `.claude/claude-wiki-pages/settings.json`. The firewall confines all agent writes to the active vault. `cross-vault` writes are blocked. The `remove` lifecycle command never deletes data. Vault merge is deferred (ADR-0012).

## Key Claims

- Registry in `.claude/claude-wiki-pages/settings.json` with `current_vault_path` as the sole active pointer.
- The firewall (`scripts/firewall.sh`) applies `cross-vault` deny before `allowPaths`.
- `remove` deregisters a vault without deleting any files on disk.
- Vault merge is a design-accepted but deferred operation (see ADR-0012).
- Exactly one vault is active at a time; `switch` changes `current_vault_path`.

## Entities Mentioned

- [[Firewall]]

## Concepts Covered

- [[Multi-Vault Registry]]
- [[Per-Vault Write Confinement]]
- [[Active Vault]]
- [[Vault Lifecycle]]

## Grounded Pages

Wiki pages that cite this source:

- [[Firewall]] — per-vault write confinement contract
- [[Multi-Vault Registry]] — registry and confinement design
- [[Plugin Architecture Synthesis]] — fail-closed safety theme
