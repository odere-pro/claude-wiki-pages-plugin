---
title: "cli.ts"
type: entity
entity_type: tool
aliases: ["cli.ts", "CLI entry point", "TypeScript CLI router", "src/cli/cli.ts"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[cli.ts Source]]", "[[Engine API Skill (SKILL.md)]]"]
related: ["[[engine.sh]]", "[[Deterministic Engine]]", "[[Engine CLI Router]]", "[[Engine Verb Surface]]"]
tags: ["tool", "typescript", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# cli.ts

## Overview

`src/cli/cli.ts` is the TypeScript entry point for the deterministic engine. It is both the router (dispatching to individual command modules) and the surface manifest (hosting the CAPABILITIES table that defines the verb set). The `main()` function parses argv, dispatches, and returns an integer exit code; the `if (import.meta.main)` guard prevents side effects when the module is imported by tests.

## Key Facts

- **CAPABILITIES table** (ADR-0015): the single source of truth for the verb surface. Every consumer — `usage()`, the dispatch router, the `PLANNED` array, and the `capabilities --json` output — derives from this one table. Before ADR-0015 the verb list was triple-stated by hand, causing silent drift; the table collapse closed that.
- **VerbStatus type**: `"implemented" | "planned"`. `CapabilityEntry` is `{ readonly name: string; readonly status: VerbStatus }`.
- **CapabilitiesReport**: extends `Report` with a `manifest: CapabilitiesManifest` field; flows through `emit()` unchanged; JSON.stringify includes the manifest automatically.
- **parseArgs()**: handles all 15 named flags — `--json`, `--help`, `--fix`, `--strict`, `--write`, `--target`, `--file`, `--type`, `--folder`, `--tag`, `--graph`, `--other-vaults`, `--ollama`, `--claude`, `--op`, `--label`.
- **emit()**: routes the Report to `JSON.stringify(report, null, 2)` or `renderText(report)` depending on `--json`.
- **16 verbs total**: 14 implemented (verify, fix, heal, doctor, config, migrate, search, firewall, backlog, propose, capabilities, ontology, route, snapshot) + 2 planned (index, link-suggest).
- **import.meta.main guard**: `if (import.meta.main) { process.exit(main()); }` makes the module importable by unit tests without spawning a process.

## Related

- [[engine.sh]] — the bash bridge that invokes this entry point
- [[Engine CLI Router]] — the dispatch pattern inside this file
- [[Engine Verb Surface]] — the CAPABILITIES table as a concept
- [[Deterministic Engine]] — design-level view of the engine
