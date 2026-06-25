---
title: "src/commands/hook.ts — Hook Gate Dispatcher"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "commands", "hook", "security"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/commands/hook.ts — Hook Gate Dispatcher

## Metadata

- **Source**: `raw/repo/src/commands/hook.ts`
- **Type**: TypeScript implementation

## Summary

The entry point for all PreToolUse hook gates. Reads the tool-call JSON from stdin, dispatches to the named security gate, and emits a block decision JSON on stdout if blocking. Always exits 0 except for a dmi hard block (exits 2). The bash wrappers stay fail-closed when Bun is absent.

## Key Claims

- Known gates: `frontmatter`, `firewall`, `check-wikilinks`, `protect-raw`, `attachments`, `dmi`, `must-rule`
- Block signal: `{ "decision": "block", "reason": "..." }` on stdout (not exit code)
- DMI hard block is the exception: exits 2 via `result.exitCode`
- `--cli` flag: batch mode for frontmatter validation over all wiki pages (replaces awk loop)
- `runHookGate()`: the dispatcher over all gate implementations
- `resolveGateName()`: maps raw string to the `GateName` union type
- Stdin PreToolUse mode reads tool-call JSON; CLI batch mode uses `--target` vault path
- Block decision: `{ decision: "block", reason }` on stdout; stderr notice for dmi/must-rule advisory
Covers: Hook Gate, PreToolUse Security Gates, Block Decision, frontmatter-cli, DMI Hard Block
