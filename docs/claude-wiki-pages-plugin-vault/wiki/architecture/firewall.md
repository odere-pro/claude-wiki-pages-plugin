---
title: "Firewall"
type: entity
entity_type: tool
aliases: ["Firewall", "firewall", "write confinement", "per-vault write confinement"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[Glossary]]", "[[ADR-0009: Multi-Vault Registry]]", "[[ADR-0016: Multi-Vault Registry Fail-Closed]]", "[[Design: Claude Config and Security]]"]
related: ["[[Multi-Vault Registry]]", "[[Vault Resolution]]", "[[Deterministic Engine]]", "[[Active Vault]]"]
tags: ["tool", "security"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Firewall

## Overview

The firewall is the vault isolation mechanism — a `PreToolUse` boundary (`scripts/firewall.sh` + `src/core/firewall.ts`) that confines all agent and tool writes to the resolved vault plus its explicit `allowPaths`, minus `denyPaths` globs. Cross-vault writes are unconditionally blocked.

## Key Facts

- **Implementation:** `scripts/firewall.sh` (bash hook) + `src/core/firewall.ts` (TS twin in the engine).
- **Deny rule order:** `cross-vault` deny is applied before `allowPaths`; `denyPaths` overrides both.
- **Modes:** `enforce` (block + exit 2), `warn` (log but allow), `off` (disabled).
- **Cross-vault:** any write to a path outside the active vault root — always blocked in `enforce` mode.
- **`protect-raw.sh`:** A companion hook blocking writes to `raw/` (except the sanctioned `raw/agent-sessions/` carve-out per ADR-0010).
- **Registry invariant:** `current_vault_path` must be in `vaults[]`; a malformed registry fails closed — `_vaults_read` exits non-zero, all writes blocked (ADR-0016).

## Related

- [[Multi-Vault Registry]] — registry that determines the active vault
- [[Vault Resolution]] — 4-tier resolver that identifies the vault path
- [[Deterministic Engine]] — `firewall` engine command for validation
- [[Active Vault]] — the single vault currently designated for writes
- [[Fail-Closed]] — the registry and firewall always fail closed on any error
