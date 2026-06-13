---
title: "engine.sh Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "bash", "bridge"]
aliases: ["engine.sh Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# engine.sh Source

## Summary

`engine.sh` is the 23-line bash bridge from hook scripts and agents to the Bun TypeScript engine. It resolves `CLAUDE_PLUGIN_ROOT`, checks for Bun, and either invokes `dist/cli.js` (pre-built) or `src/cli/cli.ts` (source via `bun` directly). When Bun is absent it prints a warning to stderr and exits 0 — graceful degradation, not a hard failure.

## Key Claims

- Sets `ROOT` from `CLAUDE_PLUGIN_ROOT` env var or resolves to parent of script directory.
- If `bun` is not in PATH, prints `WARN: Bun not found` and exits 0 (degrade gracefully).
- Prefers `dist/cli.js` (npm-installed build); falls back to `src/cli/cli.ts` (dev path).
- Uses `exec` so the bridge process is replaced by the engine process (no subshell overhead).
- All arguments passed through unchanged with `"$@"`.

## Entities Mentioned

- [[engine.sh]]
- [[Deterministic Engine]]

## Concepts Covered

- [[Engine CLI Router]]
- [[Scripts Layer]]
