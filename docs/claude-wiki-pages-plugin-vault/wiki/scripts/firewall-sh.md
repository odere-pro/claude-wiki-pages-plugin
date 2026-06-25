---
title: "firewall.sh"
type: entity
entity_type: tool
aliases: ["firewall.sh", "Write-Path Firewall Script"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-firewall-sh|scripts/firewall.sh]]"]
related: []
tags: ["scripts", "security", "hook", "fail-closed"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# firewall.sh

PreToolUse hook that confines Write/Edit operations to the resolved vault, excluding deny paths and sibling registered vaults.

## Overview

`scripts/firewall.sh` is the primary write-path enforcement hook. After the Phase 3 firewall-twin-retire, the decision authority moved to the Bun engine (`src/core/firewall.ts`). This script computes the `OTHER_VAULTS` set from the registry and passes it to the engine. The hook contract is preserved verbatim: stdout JSON for block decisions, always exit 0.

## Key Facts

- Fail-closed security gate: missing Bun blocks the write with an install-Bun reason rather than letting an unvalidated write through.
- Computes `OTHER_VAULTS` from the registry (all registered vaults minus the current active vault). Fail-closed on registry read error: falls back to the active vault path as a sentinel, yielding zero writable roots.
- Supports CLI mode (`--file`, `--json`) for tests and the parity gate.
- Allows paths added to `firewall.allowPaths` in the plugin config.
- Rejects paths in `firewall.denyPaths`.
- Cross-vault confinement prevents the active session from writing into a sibling vault's directory.

## Related

The engine twin `src/core/firewall.ts` is the authoritative decision module. `lib-vault-registry.sh` provides the `registry_other_vaults()` function.
