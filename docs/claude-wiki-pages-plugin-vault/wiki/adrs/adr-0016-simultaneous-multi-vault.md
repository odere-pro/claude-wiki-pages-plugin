---
title: "ADR-0016 Simultaneous Multi-Vault Management"
type: concept
aliases: ["ADR-0016 Simultaneous Multi-Vault Management", "ADR-0016", "multi-vault management ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0016-simultaneous-multi-vault-management]]"]
related: ["[[ADR-0009 Multi-Vault Confinement]]", "[[Multi-Vault Registry]]", "[[ADR-0012 Vault Merge Conflict Resolution]]"]
tags: [adr, vault, multi-vault]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0016: Simultaneous Multi-Vault Management

**Status:** Accepted | **Date:** 2026-06-05

## Context

ADR-0009 established the multi-vault foundation: a `vaults[]` registry, one active vault named by `current_vault_path`, and `add`/`remove`/`switch`/`list` lifecycle. This ADR extends that foundation with the management surface needed for simultaneous operation: fail-closed registry validation, read-time audit roll-up, and two-vault status side-by-side — without adding a ledger.

## Decision

**Fail-closed registry:** When `settings.json` is read, `_vaults_read()` immediately validates the `current_vault_path ∈ vaults[].path` invariant (ADR-0009). A malformed registry exits non-zero and blocks all writes before any vault-path resolution. This is earlier than ADR-0009's "block writes" — it fires at read time, so a subsequent command never sees an inconsistent state.

**Read-time audit roll-up:** When the orchestrator or a management surface needs multi-vault status, it reads the registry, resolves each vault path, and runs a deterministic `backlog` check per vault — all in one read-time pass. No ledger, no cached state file, no `last-checked` timestamp. The roll-up is cheap enough (filesystem stat + JSON parse) to run on demand.

**No ledger:** A separate audit file tracking when each vault was last checked would be a second source of truth. Decision: never introduce a ledger. Status is always read-time-derived from the actual registry and actual vault filesystem state.

**Two-vault side-by-side status:** The `status` verb on the management surface can emit status for every registered vault (backlog count, last ingest, last lint) in one call. Each row is independently derived from the vault's log and source manifest.

## Scope

This ADR covers only the management surface — it does not change the firewall, resolution order, or the active vault pointer mechanics from ADR-0009.
