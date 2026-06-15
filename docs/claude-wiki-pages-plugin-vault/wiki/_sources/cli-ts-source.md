---
title: "cli.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "cli", "router"]
aliases: ["cli.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# cli.ts Source

## Summary

`src/cli/cli.ts` is the TypeScript entry point for the deterministic engine. It defines the CAPABILITIES table as the single source of truth for the verb surface (ADR-0015), implements `parseArgs()` to handle all CLI flags, and dispatches to individual command modules. The `main()` function returns an exit code; the guard at the bottom (`if (import.meta.main)`) lets the module be imported by tests without side effects.

## Key Claims

- The `CAPABILITIES` table is the single source of truth: `IMPLEMENTED`, `PLANNED`, `ALL`, `usage()`, and the `capabilities` verb all derive from it — no second list.
- `VerbStatus` is `"implemented" | "planned"`; `CapabilityEntry` is `{ name, status }`.
- `CapabilitiesReport` extends `Report` and carries a `manifest: CapabilitiesManifest` field.
- `parseArgs()` handles all 15 named flags including `--graph`, `--other-vaults`, `--ollama`, `--claude`, `--op`, `--label`.
- The `emit()` function routes to JSON or human-text based on `--json` flag.
- `import.meta.main` guard makes the module importable by tests without spawning a process.
- 16 verbs total: 14 implemented (verify, fix, heal, doctor, config, migrate, search, firewall, backlog, propose, capabilities, ontology, route, snapshot) + 2 planned (index, link-suggest).
