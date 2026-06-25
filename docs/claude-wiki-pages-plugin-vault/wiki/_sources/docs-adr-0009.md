---
title: "ADR-0009: Multi-Vault Confinement"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-18
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0009: Multi-Vault Confinement

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-05-18
- **URL:** —

## Summary

ADR-0009 specifies the deny rule and precedence for per-vault write confinement: a session targeting Vault A cannot write Vault B. The firewall (`firewall.sh`) derives "other vaults" from the registry dynamically and blocks cross-vault writes fail-closed. Malformed registry resolves to zero writable roots.

## Key Claims

Status: Accepted. The confinement rule is: every Write/Edit passes `firewall.sh` which checks the write path against the resolved vault root; paths outside that root are blocked unconditionally. The registry (resolved by `resolve-vault.sh`) lists all known vaults; the firewall excludes all but the active one. `tests/gates/gate-11-firewall-parity.sh` pins this invariant in CI. Malformed registry → fail-closed (zero writable roots), not all-writable.

Covers: Multi-Vault Confinement, Firewall, Write Confinement, Vault Registry
