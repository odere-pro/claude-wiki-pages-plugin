---
title: "engine.sh"
type: entity
entity_type: tool
aliases: ["engine.sh", "engine shell bridge", "bash-to-Bun bridge"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[engine.sh Source]]", "[[Engine Scripts Layer (CLAUDE.md)]]", "[[Engine API Skill (SKILL.md)]]"]
related: ["[[cli.ts]]", "[[Deterministic Engine]]", "[[Scripts Layer]]", "[[Engine CLI Router]]"]
tags: ["tool", "bash", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# engine.sh

## Overview

`scripts/engine.sh` is the 23-line bash bridge that connects hook scripts and agents to the Bun TypeScript engine. It resolves the plugin root directory, verifies Bun availability, and invokes the engine — either via a pre-built `dist/cli.js` (npm install path) or directly via `src/cli/cli.ts` (development path). When Bun is absent it degrades gracefully, printing a warning and exiting 0 rather than hard-failing.

```bash
# Usage (from hook scripts or agents)
bash "${CLAUDE_PLUGIN_ROOT}/scripts/engine.sh" <command> --target <vault> --json
```

## Key Facts

- **Root resolution**: `ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"` — uses env var override when set, otherwise resolves the plugin root relative to the script's own location.
- **Graceful degradation**: if `bun` is not found in PATH, prints `[claude-wiki-pages] WARN: Bun not found — engine step skipped` to stderr and exits 0. Hot-path hooks continue to work (bash validators remain active); engine-only verbs are unavailable.
- **Prefers built artifact**: checks for `$ROOT/dist/cli.js` first (built by npm install / `bun build`). Falls back to `$ROOT/src/cli/cli.ts` for development.
- **Uses `exec`**: replaces the bridge process with the engine process — no subshell overhead, arguments pass through unchanged via `"$@"`.
- **CLAUDE_PLUGIN_ROOT env var**: the standard override for CI and local dev to pin the plugin root explicitly.

## Related

- [[cli.ts]] — the TypeScript entry point this bridge invokes
- [[Deterministic Engine]] — the broader engine entity; design-level view
- [[Scripts Layer]] — the shell anatomy this bridge is part of
- [[Engine CLI Router]] — the dispatch logic inside cli.ts
