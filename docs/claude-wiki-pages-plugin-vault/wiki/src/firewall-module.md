---
title: "Firewall Module"
type: concept
aliases: ["firewall-module", "Write Isolation", "firewall.ts"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-firewall|src/core/firewall.ts — Write Isolation Authority]]"]
related: []
tags: ["src", "core", "firewall", "security"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Firewall Module

The sole decision authority for write isolation. `core/firewall.ts` is the only implementation — the bash hook `scripts/firewall.sh` is a thin stdin→engine wrapper since firewall-twin-retire.

## Definition

The firewall decides whether an agent may write to a given file path. Writes are confined to the resolved vault, plus `allowPaths` roots, minus `denyPaths` globs (which win everywhere).

## Key Principles

**Decision precedence:**
1. `deny` rules win everywhere, even inside vault or allowPaths
2. Cross-vault: writes to sibling registered vaults blocked regardless of allowPaths
3. Vault-root: allowed
4. `allowPaths`: each entry grants access
5. Outside-vault: blocked under `enforce`, advise under `warn`

**`FirewallMode`**: `"enforce" | "warn" | "off"`. `warn` never blocks (advisory only). `off` is a full pass-through.

**`globToRegExp()`**: the ONE glob dialect — `*` within a segment, `**` across segments. Exported so backlog's wired-source filter reuses it; no second glob dialect exists.

**Symlink safety (S3/F1)**: target and every boundary root reduced to physical paths (symlinks dereferenced) before any check. A symlink inside the active vault pointing at a sibling cannot smuggle writes out. `physicalPath()` dereferences with loop guard `SYMLINK_LOOP_MAX = 40`.

**`otherVaults`**: write to a sibling registered vault is blocked as "cross-vault" — cannot be overridden by `allowPaths`.

**Anti-drift**: gate-11 checks the engine against a GOLDEN verdict table, not a bash twin. No two implementations can drift.

## Examples

- `decide(filePath, policy)` returns `FirewallDecision`: `{ allowed, matchedRule, mode }`
- `matchedRule` values: `"vault"`, `"allow:<pattern>"`, `"deny:<pattern>"`, `"outside-vault"`, `"cross-vault"`, `"disabled"`, `"off"`
- When `mode === "warn"`: always `allowed: true` with the advisory rule name

## Related Concepts

- Backs the `firewall` CLI verb and the hook gate in `commands/hook/firewall-gate.ts`
- Bash hook `scripts/firewall.sh` now a thin stdin→engine wrapper (no independent logic)
- The one glob dialect `globToRegExp` is also used by `backlog` wired-source filter
