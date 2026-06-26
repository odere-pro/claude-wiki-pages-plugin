---
title: "ADR-0016: Simultaneous Multi-Vault Management"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-12
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0016: Simultaneous Multi-Vault Management

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-12
- **URL:** —

## Summary

ADR-0016 brings simultaneous multi-vault management in scope (Phase M), reusing existing provenance surfaces (per-vault `wiki/log.md` and ADR-0010 agent-session sources) for audit rather than adding a parallel ledger. A read-only roll-up aggregates across the registry. The existing firewall confinement (ADR-0009) already handles cross-vault write isolation.

## Key Claims

Status: Accepted. Multi-vault management reuses the vault registry from `resolve-vault.sh`. Each vault keeps its own `wiki/log.md`. A read-only audit roll-up aggregates per-vault logs to answer "who / when / which vault / from what source". Writes stay confined per vault (ADR-0009 firewall unchanged). The new element is simultaneous management: the orchestrator can address multiple vaults in one session, but writes only ever land in the active vault. Malformed registry → fail-closed.

Covers: Multi-Vault Management, Vault Registry, Audit Roll-Up, Phase M
