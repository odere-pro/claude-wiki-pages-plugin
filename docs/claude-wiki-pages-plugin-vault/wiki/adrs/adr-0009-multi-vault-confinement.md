---
title: "ADR-0009 Multi-Vault Confinement"
type: concept
aliases: ["ADR-0009 Multi-Vault Confinement", "ADR-0009", "multi-vault confinement ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0009-multi-vault-confinement]]"]
related: ["[[Multi-Vault Registry]]", "[[ADR-0016 Simultaneous Multi-Vault Management]]", "[[Hook System]]"]
tags: [adr, vault, multi-vault, security]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement

**Status:** Accepted | **Date:** 2026-06-05

## Problem

Decision #3 added multi-vault support but kept the strict invariant: one active vault at a time; writes go only to the active vault. The hazard: "support multiple vaults" reads as "relax confinement," when the requirement is the opposite. A `firewall.allowPaths` entry that is too broad could let a sibling vault through the catch-all `outside-vault` rule.

## Decision

**Registry shape (additive):** `.claude/claude-wiki-pages/settings.json` gains a `vaults: [{path, name}]` array. `current_vault_path` remains the sole source of truth for which vault is active — no second "active" flag. A settings file without `vaults` stays valid (legacy backward-compat).

**Resolution unchanged:** `scripts/resolve-vault.sh:resolve_vault()` still returns `current_vault_path`; the registry is a sidecar the firewall reads, never a new resolution input.

**Lifecycle:** `add`/`remove`/`switch`/`list` extend the existing vault-pointer seam. `remove` deregisters only — never deletes data. `merge` is explicitly **not** in this set (Phase 3, see ADR-0012).

**Cross-vault rule:** Both firewall twins gain a `cross-vault` deny that fires when a write lands under any inactive registered vault. Precedence: deny → cross-vault → vault → allowPaths → outside-vault. Placing `cross-vault` before `allowPaths` means a sibling vault is blocked **even if `allowPaths` is permissive**. Gate-11 extends with a cross-vault fixture matrix.

## Key Alternatives Rejected

- **A second "active" flag in the registry** — two sources of truth; they drift apart.
- **Relax single-active confinement** — directly contradicts decision #3.
- **Let `remove` delete the vault directory** — unrecoverable; user data is never destroyed.
