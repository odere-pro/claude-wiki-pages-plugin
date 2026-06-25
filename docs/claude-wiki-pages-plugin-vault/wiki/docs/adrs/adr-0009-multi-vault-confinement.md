---
title: "ADR-0009: Multi-Vault Confinement"
type: entity
entity_type: standard
aliases: ["ADR-0009", "adr-0009", "multi-vault confinement ADR", "vault confinement"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0009|ADR-0009: Multi-Vault Confinement]]"]
related: []
tags: ["docs", "adrs", "security", "multi-vault"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0009: Multi-Vault Confinement

Specifies the deny rule and precedence for per-vault write confinement: a session targeting Vault A cannot write to Vault B; a malformed registry resolves fail-closed to zero writable roots.

## Overview

ADR-0009 is the security contract for multi-vault deployments. `firewall.sh` derives the set of "other vaults" from the registry dynamically and blocks writes to any path outside the resolved active vault. `tests/gates/gate-11-firewall-parity.sh` pins this invariant in CI.

## Key Facts

**Status:** Accepted

**Decision:** Per-vault write confinement via `firewall.sh`:
- Every Write/Edit passes `firewall.sh` before landing.
- `firewall.sh` checks the write path against the resolved vault root.
- Paths outside the active vault root are blocked unconditionally (fail-closed).
- A malformed registry → zero writable roots (not all-writable).

**Registry derivation:** `resolve-vault.sh` lists all known vaults. The firewall excludes all but the active one. The registry is re-derived at each check — it is never cached in a way that could grow stale.

**CI gate:** `tests/gates/gate-11-firewall-parity.sh` verifies the bash and TypeScript implementations agree on every deny case.

**Consequences:**
- Cross-vault contamination is impossible by construction.
- A misconfigured or missing registry is always safe — it produces zero writable roots.
- ADR-0016 (simultaneous multi-vault management) builds on this confinement without modifying it.

## Related

ADR-0016 adds simultaneous management of N vaults on top of this confinement. The firewall is wired as the first PreToolUse hook (before all validators) per `hooks/hooks.json`.
