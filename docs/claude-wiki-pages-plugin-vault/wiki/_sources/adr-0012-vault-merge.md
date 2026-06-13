---
title: "ADR-0012: Vault Merge Conflict Resolution"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "vault", "merge"]
aliases: ["ADR-0012: Vault Merge Conflict Resolution"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0012: Vault Merge Conflict Resolution

## Summary

Design for vault merge is accepted but implementation is deferred. The design: dedup-and-flag, source-read/active-write, `_proposed/` for collisions. Merge is a lifecycle operation that consolidates two vaults without losing provenance.

## Key Claims

- Vault merge design is accepted but not yet shipped.
- Approach: dedup by `sources` and title, flag collisions for human review via `_proposed/`.
- Source vault is read-only during merge; active vault receives writes.
- Provenance is preserved: every page's `sources` chain remains intact.
- `merge` is deferred from `set-vault.sh` lifecycle commands until implemented.

## Entities Mentioned

- [[Firewall]]

## Concepts Covered

- [[Vault Lifecycle]]
- Vault Merge (deferred; design: dedup-and-flag, source read-only, `_proposed/` for collisions)
- [[Multi-Vault Registry]]

## Grounded Pages

Wiki pages that cite this source:

- [[Multi-Vault Registry]] — merge deferred, design accepted
