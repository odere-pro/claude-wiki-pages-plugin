---
title: "Firewall"
type: entity
entity_type: tool
aliases: ["Firewall", "firewall", "write confinement", "per-vault write confinement"]
parent: "[[Wiki Engine]]"
path: "engine"
sources:
  [
    "[[Architecture Documentation]]",
    "[[Glossary]]",
    "[[ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement]]",
    "[[ADR-0016: Simultaneous Multi-Vault Management]]",
    "[[Design: Claude Config and Security]]",
    "[[firewall.ts Source]]",
    "[[Engine Scripts Layer (CLAUDE.md)]]",
  ]
related:
  [
    "[[Multi-Vault Registry]]",
    "[[Vault Resolution]]",
    "[[Deterministic Engine]]",
    "[[Active Vault]]",
    "[[Hook System]]",
    "[[Scripts Layer]]",
  ]
tags: ["tool", "security"]
created: 2026-06-13
updated: 2026-06-13
update_count: 7
status: active
confidence: 1.0
---

# Firewall

> [!summary]
> The firewall is the vault isolation mechanism — a `PreToolUse` boundary that confines all agent and tool writes to the resolved vault. It is implemented as twin enforcement points: `scripts/firewall.sh` (bash hook) and `src/core/firewall.ts` (TypeScript engine). Both twins must produce identical verdicts for every test case (enforced by gate-11). Cross-vault writes are always denied with a dedicated `cross-vault` rule that cannot be overridden by `allowPaths`. The firewall fails closed on any error: no write, not "write anyway."

## Key Facts

- **Type:** tool (dual-implementation: `scripts/firewall.sh` bash hook + `src/core/firewall.ts` TypeScript engine)
- **Event:** fires on every `PreToolUse` for Write/Edit tool calls, before any other validator
- **Default mode:** `enforce` — blocks writes with exit code 2; `warn` and `off` modes exist for debugging only
- **Cross-vault rule:** sits at priority 2, before `allowPaths`; cannot be overridden by a permissive allow entry
- **Fail-closed behavior:** malformed registry → `otherVaults` = all registered vaults → all writes to any registered vault blocked
- **Symlink hardening:** both twins canonicalise paths physically (`cd && pwd -P` in bash; `realpathSync()` in TypeScript) to catch symlink escapes
- **Parity gate:** `tests/gates/gate-11-firewall-parity.sh` keeps both twins byte-aligned; divergence fails CI
- **Companion hook:** `protect-raw.sh` enforces the complementary constraint — writes within the vault are restricted to `wiki/` and `raw/agent-sessions/`

## Overview

Every Write or Edit tool call fires the `PreToolUse` hook chain. The firewall (`scripts/firewall.sh`) runs first, before any other validator, because no other check is meaningful if the write escapes the vault. If the firewall blocks, the tool call is rejected with exit code 2 — the write never touches the filesystem.

The decision follows a fixed rule order:

```
deny → cross-vault → vault (allow) → allowPaths → denyPaths → outside-vault
```

The `cross-vault` rule sits before `allowPaths` intentionally: a permissive `allowPaths` entry cannot accidentally allow a write to a sibling vault. This is the "allow-proof" property introduced in ADR-0009.

## Two Twins, One Contract

The firewall is implemented twice — in bash and in TypeScript — because the bash hook fires in the Claude Code hook system (where Bun may not be running) while the TypeScript twin is called by the engine's `firewall` verb for agent-side validation:

- **`scripts/firewall.sh`** — the live hook; fires on every Write/Edit `PreToolUse` event. Canonicalises paths by `cd "$dir" && pwd` to resolve symlinks physically.
- **`src/core/firewall.ts`** — the engine's twin; callable as `bash scripts/engine.sh firewall --target <vault> --path <p>`. Uses `resolve()` for logical path canonicalisation.

Gate-11 (`tests/gates/gate-11-firewall-parity.sh`) pins the two twins against a fixture matrix that includes:

- Active vault writes → verdict `vault`
- Sibling vault writes → verdict `cross-vault`
- deny-inside-sibling → verdict `deny` (deny overrides cross-vault)
- Outside-all → verdict `outside-vault`
- Symlinked escape into sibling vault → verdict `cross-vault` (hardened in ADR-0009)

If the two twins diverge on any case, gate-11 fails CI.

## Rule Precedence

| Priority | Rule            | Description                                                   |
| -------- | --------------- | ------------------------------------------------------------- |
| 1        | `deny`          | Explicit deny list entries; overrides everything              |
| 2        | `cross-vault`   | Write lands inside a registered inactive vault root           |
| 3        | `vault`         | Write lands inside the active vault root → allow              |
| 4        | `allowPaths`    | Explicit allow-list entries inside the vault                  |
| 5        | `denyPaths`     | Glob-pattern deny list inside the vault                       |
| 6        | `outside-vault` | Write is outside the active vault and not caught above → deny |

The `cross-vault` rule is placed at priority 2 — before the active-vault allow and before `allowPaths`. This means: even if an `allowPaths` entry is broad enough to cover a sibling vault's path, the `cross-vault` rule fires first and blocks the write. This is the key security property that makes multi-vault management safe.

## Modes

| Mode      | Behavior                              |
| --------- | ------------------------------------- |
| `enforce` | Block and exit 2 on violation         |
| `warn`    | Log the violation but allow the write |
| `off`     | Disabled entirely                     |

The default mode is `enforce`. The `warn` mode exists for debugging, but should never be the production setting — it defeats the write-confinement guarantee.

## The `cross-vault` Rule (ADR-0009)

The multi-vault registry (`.claude/claude-wiki-pages/settings.json`) stores all registered vault paths in `vaults[]`. The firewall reads this registry to derive `otherVaults` — all registered vaults minus the active one — and denies any write whose target path falls under any of those roots.

This rule was added when multi-vault support (ADR-0009) extended the registry from a single `current_vault_path` to a `vaults[]` array. Before this, sibling vault writes were caught by the catch-all `outside-vault` rule — but `outside-vault` can be overridden by `allowPaths`. The dedicated `cross-vault` rule at higher priority closes that gap.

**Registry invariant:** `current_vault_path` must equal exactly one `vaults[].path`. A malformed registry causes `_vaults_read` to exit non-zero, which sets `otherVaults` to the full `vaults[]` array — blocking all writes to any registered vault. This is the fail-closed behavior: the safe default is "no write."

## Symlink Hardening

Both twins canonicalise paths before comparison. The bash twin uses `cd "$dir" && pwd -P`, which resolves symlinks physically. The TypeScript twin uses Node's `fs.realpathSync()`. This ensures that a symlink from inside the active vault pointing into a sibling vault is caught as a `cross-vault` violation, not silently allowed.

## `protect-raw.sh` — Companion Hook

A companion hook, `protect-raw.sh`, fires alongside the firewall in the `PreToolUse` chain. It blocks any write to `vault/raw/` with a single exception: `raw/agent-sessions/` is the sanctioned write channel for the durable-memory carve-out (ADR-0010), where session context is persisted as an `agent-session` source for later ingest.

The firewall confines writes to the vault; `protect-raw.sh` confines writes within the vault to `wiki/` (and `raw/agent-sessions/`). Together they implement: **all writes go to the active vault's `wiki/` only**.

## Related

- [[Multi-Vault Registry]] — the registry the firewall reads for `otherVaults`
- [[Vault Resolution]] — the 4-tier resolver that identifies the active vault root
- [[Deterministic Engine]] — the `firewall` verb for programmatic confinement checks
- [[Hook System]] — the broader `PreToolUse` hook chain that fires the firewall
- [[Active Vault]] — `current_vault_path` designates the one allowed write root
