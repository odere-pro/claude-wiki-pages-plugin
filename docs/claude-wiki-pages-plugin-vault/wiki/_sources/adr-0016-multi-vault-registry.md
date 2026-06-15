---
title: "ADR-0016: Simultaneous Multi-Vault Management"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "vault", "registry"]
aliases: ["ADR-0016: Simultaneous Multi-Vault Management"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0016: Simultaneous Multi-Vault Management

## Summary

Fixes the OQ-9 fail-closed issue: the registry is now fail-closed on malformed JSON or when `current_vault_path` is not in `vaults[]`. A read-time audit roll-up surfaces violations immediately.

## Key Claims

- Registry fails closed on malformed JSON: `_vaults_read` exits non-zero, all writes are blocked.
- Invariant: `current_vault_path` must equal exactly one `vaults[].path`. Violation → fail-closed.
- `init_vault_settings` creates `settings.json` without a `vaults` key (progressive disclosure).
- The `vaults` array is introduced only by the first `vault_add`.
- A fresh or legacy `settings.json` without `vaults` is valid; tier-4 default fallback applies.
