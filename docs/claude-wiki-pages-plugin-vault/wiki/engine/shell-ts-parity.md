---
title: "Shell-TS Parity"
type: concept
aliases: ["Shell-TS Parity", "shell-ts parity", "bash-TypeScript parity", "firewall parity", "verify parity", "parity gates"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[Engine Scripts Layer (CLAUDE.md)]]", "[[firewall.ts Source]]"]
related: ["[[Scripts Layer]]", "[[Firewall]]", "[[engine.sh]]", "[[Degraded-Mode Routing]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "engine", "scripts", "parity"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Shell-TS Parity

> [!summary]
> Shell-TS parity is the requirement that two pairs of scripts — `firewall.sh`/`firewall.ts` and `verify-ingest.sh`/engine `verify` — produce byte-aligned equivalent results. Parity is enforced by CI gates: `gate-11-firewall-parity` and `gate-05`. When Bun is absent, the shell twin remains active; when Bun is present, both twins are available and must agree.

## Definition

The plugin's Layer 4 (Orchestration) is deliberately shell-first: hooks run synchronously and per-keystroke, so they must be available in any environment, including environments where Bun/Node is not installed. But the engine (Layer 4 TypeScript) provides richer functionality and better testability. Two components are therefore implemented twice — once as bash scripts and once as TypeScript modules:

| Shell twin | TypeScript twin | Parity gate |
| --- | --- | --- |
| `scripts/firewall.sh` | `src/core/firewall.ts` | `gate-11-firewall-parity` |
| `scripts/verify-ingest.sh` | engine `verify` verb | `gate-05` |

Both twins in each pair must produce the same output for the same input. If they diverge, the parity gate fails CI and blocks the commit.

## Why Two Implementations

**Availability.** Hooks must run in every environment. `scripts/firewall.sh` is a pure bash script with no dependencies beyond `jq` and standard POSIX tools. It runs whether or not Bun is installed.

**Testability and extensibility.** `src/core/firewall.ts` is easier to unit-test, extend, and integrate with the engine's type system. New checks are easier to add in TypeScript.

**Degraded-mode guarantee.** When Bun is absent ([[Degraded-Mode Routing]] returns `bun: false`), the TypeScript twin is unavailable. The shell twin stays active and enforces the same semantics. Users in degraded mode (e.g., a machine without Bun) still get full firewall enforcement.

## Parity Enforcement

The parity gates run the shell twin and the TypeScript twin against the same test fixtures and compare their outputs:

1. **Fixtures** — a set of vault states and proposed write operations in `tests/scripts/`.
2. **Shell output** — `bash scripts/firewall.sh` with each fixture.
3. **TypeScript output** — `bun run src/core/firewall.ts` with the same fixture.
4. **Comparison** — the outputs must be byte-identical (after whitespace normalization).

A divergence — even a whitespace difference in a non-semantic field — fails the gate. This strictness is intentional: semantic divergence is the risk, and the gate must catch any symptom.

## Coupling Principle

"Hook wiring (hooks.json ↔ scripts ↔ tests) is a coupled unit — change all three together" (Engine Scripts Layer CLAUDE.md). The same coupling applies to shell-TS twins: a change to `firewall.sh` must be reflected in `firewall.ts` (or vice versa) in the same commit. The parity gate enforces this after the fact, but the development discipline is to change both simultaneously.

## Related Concepts

- [[Scripts Layer]] — the full Layer 4 shell anatomy; shell-TS parity is one of its key invariants
- [[Firewall]] — one of the two parity-twinned components
- [[engine.sh]] — the bash bridge that invokes the TypeScript engine; itself does not have a TypeScript twin (it is the bridge, not a twin)
- [[Degraded-Mode Routing]] — the degradation mode where only the shell twin is available
