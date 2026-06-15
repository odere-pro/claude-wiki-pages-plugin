---
title: "engine.sh"
type: entity
entity_type: tool
aliases: ["engine.sh", "engine shell bridge", "bash-to-Bun bridge"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[engine-sh-source|engine.sh Source]]", "[[engine-scripts-layer-claude|Engine Scripts Layer (CLAUDE.md)]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]"]
related: ["[[cli-ts|cli.ts]]", "[[deterministic-engine|Deterministic Engine]]", "[[scripts-layer|Scripts Layer]]", "[[engine-cli-router|Engine CLI Router]]", "[[degraded-mode-routing|Degraded-Mode Routing]]", "[[shell-ts-parity|Shell-TS Parity]]"]
tags: ["tool", "bash", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# engine.sh

## Overview

`scripts/engine.sh` is the 23-line bash bridge that connects hook scripts and agents to the Bun TypeScript engine. It resolves the plugin root directory, verifies Bun availability, and invokes the engine — either via a pre-built `dist/cli.js` (npm install path) or directly via `src/cli/cli.ts` (development path). When Bun is absent it degrades gracefully, printing a warning and exiting 0 rather than hard-failing.

The bridge is the single coupling point between the shell orchestration layer (Layer 4) and the Bun runtime. Every caller — hook scripts, agents, and the `claude-wiki-pages-curator-agent` heal loop — goes through this file. It is intentionally minimal: 23 lines, no logic, pure dispatch.

```bash
# Usage (from hook scripts or agents)
bash "${CLAUDE_PLUGIN_ROOT}/scripts/engine.sh" <command> --target <vault> --json
```

## Key Facts

- **Root resolution**: `ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"` — uses env var override when set, otherwise resolves the plugin root relative to the script's own location. The `CLAUDE_PLUGIN_ROOT` env var is the standard override for CI and local dev.
- **Graceful degradation**: if `bun` is not found in PATH, prints `[claude-wiki-pages] WARN: Bun not found — engine step skipped` to stderr and exits 0. Hot-path bash hooks (`validate-frontmatter.sh`, `firewall.sh`, `check-wikilinks.sh`) remain active; engine-only verbs (`verify`, `fix`, `heal`, `search`, `migrate`) are unavailable. See [[degraded-mode-routing|Degraded-Mode Routing]] for the full degradation policy.
- **Prefers built artifact**: checks for `$ROOT/dist/cli.js` first (built by npm install / `bun build`). Falls back to `$ROOT/src/cli/cli.ts` for the development path.
- **Uses `exec`**: replaces the bridge process with the engine process — no subshell overhead, arguments pass through unchanged via `"$@"`.
- **16 verbs available** (when Bun is present): 14 implemented (`verify`, `fix`, `heal`, `doctor`, `config`, `migrate`, `search`, `firewall`, `backlog`, `propose`, `capabilities`, `ontology`, `route`, `snapshot`) plus 2 planned (`index`, `link-suggest`).
- **Callers in the hot path**: `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, and `subagent-commit-gate.sh` all call `engine.sh heal` or `engine.sh verify` as part of the SubagentStop gate chain.

## Degraded Behavior

When Bun is absent the plugin operates in a reduced-capability mode:

| Capability        | With Bun        | Without Bun                      |
| ----------------- | --------------- | -------------------------------- |
| Schema validation | Engine `verify` | `verify-ingest.sh` bash fallback |
| Auto-heal         | Engine `heal`   | Not available                    |
| Search / recall   | Engine `search` | Not available                    |
| Frontmatter gates | bash hooks      | bash hooks (unchanged)           |
| Wikilink gates    | bash hooks      | bash hooks (unchanged)           |

The `doctor` verb (`engine.sh doctor`) detects this state and prints a `D04/D05` finding with an install hint. The `SessionStart` hook also prints a one-line notice when Bun is missing.

## Related

- [[cli-ts|cli.ts]] — the TypeScript entry point this bridge invokes
- [[deterministic-engine|Deterministic Engine]] — design-level view of the engine tier
- [[scripts-layer|Scripts Layer]] — the shell anatomy this bridge is part of
- [[engine-cli-router|Engine CLI Router]] — the dispatch logic inside cli.ts
- [[degraded-mode-routing|Degraded-Mode Routing]] — policy for operation without Bun
- [[shell-ts-parity|Shell-TS Parity]] — the parity contract between bash gates and the TS engine
