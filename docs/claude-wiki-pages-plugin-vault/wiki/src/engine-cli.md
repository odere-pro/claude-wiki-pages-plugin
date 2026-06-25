---
title: "Engine CLI"
type: entity
entity_type: tool
aliases: ["engine-cli", "CLI Router", "cli.ts"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-cli-router|src/cli — Engine CLI Router]]", "[[src-engine-overview|src — Deterministic Engine Overview]]"]
related: []
tags: ["src", "cli", "router", "engine"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Engine CLI

The argv router for the deterministic engine. Parses `process.argv`, dispatches to a named command handler, emits the result as JSON or text, and returns an exit code.

## Overview

`src/cli/cli.ts` is a router only: it holds no domain logic. Every check, repair, and search lives in `core/`. The shape is a four-step pipeline: `parseArgs → dispatch → emit → exitCode`.

## Key Facts

**CAPABILITIES table** is the single source of truth for all verbs (ADR-0015 N1, N2, N3). Every consumer — `IMPLEMENTED` set, `PLANNED` array, `ALL`, `usage()`, and the `capabilities` verb — derives from this table. Adding or retiring a verb is a one-line edit in the table.

**Verb handler registry (`VERB_HANDLERS`)**: a `Record<string, (args: ParsedArgs) => Promise<number> | number>`. `main()` looks up and delegates — no 19-branch if-chain. Adding a new verb is a one-handler + one-entry change.

**Implemented verbs (19)**: `verify`, `fix`, `heal`, `doctor`, `config`, `migrate`, `search`, `firewall`, `backlog`, `propose`, `capabilities`, `ontology`, `route`, `snapshot`, `context`, `okf`, `lint`, `export`, `hook`.

**Planned (declared, stub)**: `index`, `link-suggest` — return a `not-implemented` stub (exit 0) so the CLI surface is stable before the milestones fill them in.

**Exit codes**: 0 ok, 1 problem found, 2 usage error (missing flag / unknown command), 3 strict warning (doctor `--strict`).

**`--json` flag**: universally supported; switches from `renderText()` to `JSON.stringify` for agent consumption.

**Hook CLI mode (`--cli`)**: batch frontmatter validation over all wiki pages — replaces the awk validate_content loop in `scripts/validate-frontmatter.sh`.

**`readStdin()`**: reads the PreToolUse tool-call JSON from stdin for hook gates. Returns `""` when stdin is empty (fail-open for empty payload).

## Related

- The `CAPABILITIES` table implements ADR-0015 self-description surfaces
- The verb handler pattern follows the facade corrective pattern (N01)
- `parseArgs` in `cli/args.ts` performs a single left-to-right scan into a frozen `ParsedArgs`
