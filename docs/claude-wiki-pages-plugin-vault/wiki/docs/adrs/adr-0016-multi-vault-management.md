---
title: "ADR-0016: Simultaneous Multi-Vault Management"
type: entity
entity_type: standard
aliases: ["ADR-0016", "adr-0016", "multi-vault management ADR", "Phase M"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0016|ADR-0016: Simultaneous Multi-Vault Management]]"]
related: []
tags: ["docs", "adrs", "multi-vault", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0016: Simultaneous Multi-Vault Management

Brings simultaneous multi-vault management (Phase M) in scope by reusing existing provenance surfaces for audit rather than adding a parallel ledger, with per-vault write confinement (ADR-0009) unchanged.

## Overview

ADR-0016 answers the question "can one session manage N vaults at once?" with yes — but only by reusing what already exists. Each vault keeps its own log; a read-only roll-up aggregates them. The firewall confinement (ADR-0009) applies per-vault write at every step.

## Key Facts

**Status:** Accepted

**What is new (Phase M):** Simultaneous management of N vaults in one session. The orchestrator can address multiple vaults, but writes only land in the active vault.

**What is reused:**
- Per-vault `wiki/log.md` — audit trail per vault (existing).
- ADR-0010 `agent-session` sources — durable memory per vault (existing).
- ADR-0009 firewall confinement — cross-vault write isolation (existing, unchanged).

**Audit roll-up:** A read-only aggregator across the vault registry answers "who / when / which vault / from what source". It does NOT add a new ledger file (Skeptic veto V3 in the brainstorm team rejected a parallel ledger).

**Fail-closed:** A malformed or missing registry resolves to zero writable roots — never to all-writable.

**Consequences:**
- Users can open two vaults in one session and manage both without vault A contaminating vault B.
- The roll-up is a read view; truth lives in the per-vault logs.
- No new audit surface — existing provenance channels cover the multi-vault case.

## Related

ADR-0009 provides the foundational per-vault confinement this ADR builds on. The vault registry is managed by `resolve-vault.sh` and `set-vault.sh`.
