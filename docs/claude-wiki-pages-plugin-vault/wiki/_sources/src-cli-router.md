---
title: "src/cli — Engine CLI Router"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "cli", "router"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/cli — Engine CLI Router

## Metadata

- **Source**: `raw/repo/src/cli/cli.ts` + `raw/repo/src/cli/CLAUDE.md`
- **Type**: TypeScript implementation + architecture document

## Summary

`cli/cli.ts` is the engine's argv router. It parses `process.argv`, dispatches to a command handler under `commands/`, emits the result as JSON or text, and returns an exit code. It holds no domain logic — every check, repair, and search lives in `core/`. The shape is a four-step pipeline: `parseArgs → dispatch → emit → exitCode`.

## Key Claims

- `CAPABILITIES` table is the single source of truth for all verbs (ADR-0015 N1, N2, N3)
- Implemented verbs (19): `verify`, `fix`, `heal`, `doctor`, `config`, `migrate`, `search`, `firewall`, `backlog`, `propose`, `capabilities`, `ontology`, `route`, `snapshot`, `context`, `okf`, `lint`, `export`, `hook`
- Planned verbs: `index`, `link-suggest` (return `not-implemented` stub, exit 0)
- `VERB_HANDLERS` registry: each verb maps to a handler function; main() looks up and delegates
- `--json` flag universally supported for agent consumption
- Exit codes: 0 ok, 1 problem found, 2 usage error, 3 strict warning (doctor)
- `readStdin()` reads PreToolUse tool-call JSON for hook gates
- `handleHookCli` handles batch frontmatter validation replacing awk loop
- `emit()` routes to JSON or `renderText()` based on `--json` flag
Covers: CLI Router, CAPABILITIES Table, Verb Handlers, Arg Parsing, Hook Gate Entry
