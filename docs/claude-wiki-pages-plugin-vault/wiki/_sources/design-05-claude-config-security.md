---
title: "Design: Claude Config and Security"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "security", "config", "firewall"]
aliases: ["Design: Claude Config and Security"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design: Claude Config and Security

## Summary

Documents the vault resolution 4-tier order, the fail-closed write boundary flowchart, dev-time vs runtime isolation, and the multi-vault audit roll-up.

## Key Claims

- Vault resolution 4-tier: (1) `CLAUDE_WIKI_PAGES_VAULT` env var, (2) `settings.json` `current_vault_path`, (3) auto-detect (scan 4 levels for CLAUDE.md + wiki/ sibling), (4) default `docs/vault`.
- Fail-closed write boundary: firewall denies cross-vault writes before allowing anything; then `allowPaths`; then `denyPaths` globs override both.
- Dev-time isolation: root `CLAUDE.md` is the plugin contributor guide; `docs/vault-example/CLAUDE.md` is the schema authority. They serve different audiences.
- Multi-vault audit roll-up: registry violations are surfaced immediately at read time, not deferred.

## Entities Mentioned

- [[Firewall]]

## Concepts Covered

- [[Vault Resolution]]
- [[Per-Vault Write Confinement]]
- [[Fail-Closed]]
- [[Multi-Vault Registry]]

## Grounded Pages

Wiki pages that cite this source:

- [[Design Diagrams]] — config and security perspective
- [[Vault Resolution]] — config layering
- [[Firewall]] — security boundary
