---
title: "cli.ts"
type: entity
entity_type: tool
aliases: ["cli.ts", "CLI entry point", "TypeScript CLI router", "src/cli/cli.ts"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[cli.ts Source]]", "[[Engine API Skill (SKILL.md)]]", "[[Engine Scripts Layer (CLAUDE.md)]]"]
related: ["[[engine.sh]]", "[[Deterministic Engine]]", "[[Engine CLI Router]]", "[[Engine Verb Surface]]", "[[Shell-TS Parity]]", "[[Degraded-Mode Routing]]"]
tags: ["tool", "typescript", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# cli.ts

## Overview

`src/cli/cli.ts` is the TypeScript entry point for the deterministic engine. It is both the router (dispatching to individual command modules) and the surface manifest (hosting the CAPABILITIES table that defines the verb set). The `main()` function parses argv, dispatches, and returns an integer exit code; the `if (import.meta.main)` guard prevents side effects when the module is imported by tests.

`cli.ts` is the file that `engine.sh` invokes (either through `dist/cli.js` or directly via `bun run`). It is not called in hook hot-paths — bash gates run directly. The engine is called from write-path closers (`subagent-commit-gate.sh`, `subagent-lint-gate.sh`) and from agent skills after ingest or heal cycles.

## Key Facts

- **CAPABILITIES table** (ADR-0015): the single source of truth for the verb surface. Every consumer — `usage()`, the dispatch router, the `PLANNED` array, and the `capabilities --json` output — derives from this one table. Before ADR-0015 the verb list was triple-stated by hand, causing silent drift; the table collapse closed that.
- **VerbStatus type**: `"implemented" | "planned"`. `CapabilityEntry` is `{ readonly name: string; readonly status: VerbStatus }`.
- **CapabilitiesReport**: extends `Report` with a `manifest: CapabilitiesManifest` field; flows through `emit()` unchanged; JSON.stringify includes the manifest automatically.
- **import.meta.main guard**: `if (import.meta.main) { process.exit(main()); }` makes the module importable by unit tests without spawning a process. Tests call `main()` directly with mocked argv.
- **16 verbs total**: 14 implemented + 2 planned.

## Implemented Verbs

| Verb | Role |
|---|---|
| `verify` | Read-only integrity check; returns structured findings JSON |
| `fix` | Deterministic safe repairs (dedupe index, sync children) |
| `heal` | Git-checkpointed loop: verify → fix → re-verify until clean |
| `doctor` | Environment + vault health (D01–D10 checks) |
| `config` | Show/validate effective configuration |
| `migrate` | Upgrade schema_version in place (v1→v2→v3) |
| `search` | Deterministic keyword retrieval over wiki/ |
| `firewall` | Evaluate a write path against the firewall config |
| `backlog` | List unprocessed raw/ sources |
| `propose` | Draft-to-wiki promotion workflow |
| `capabilities` | Return the CAPABILITIES manifest as JSON |
| `ontology` | Lint predicate domain/range against ontology profile |
| `route` | Report effective model routing decision (claude/local/blocked) |
| `snapshot` | Git-checkpoint the vault (pre / post / label) |
| `index` | _(planned)_ |
| `link-suggest` | _(planned)_ |

## CLI Flags

`parseArgs()` handles all 15 named flags:

| Flag | Purpose |
|---|---|
| `--json` | Emit structured JSON (always pass for machine use) |
| `--help` | Print usage |
| `--fix` | Apply repairs (for `doctor`) |
| `--strict` | Exit 3 on any warn/fail |
| `--write` | Apply changes in place (for `migrate`) |
| `--target` | Vault root path |
| `--file` | Target a single file |
| `--type` | Page type filter |
| `--folder` | Folder filter |
| `--tag` | Tag filter |
| `--graph` | Enable graph traversal in search |
| `--other-vaults` | Colon-separated other vault paths (firewall cross-vault isolation) |
| `--ollama` | Force local Ollama routing |
| `--claude` | Force Claude routing |
| `--op` / `--label` | Snapshot operation and label |

## Related

- [[engine.sh]] — the bash bridge that invokes this entry point
- [[Engine CLI Router]] — the dispatch pattern inside this file
- [[Engine Verb Surface]] — the CAPABILITIES table as a concept
- [[Deterministic Engine]] — design-level view of the engine
- [[Shell-TS Parity]] — the parity contract between bash gates and this module
- [[Degraded-Mode Routing]] — what happens when cli.ts cannot be invoked
