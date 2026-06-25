---
title: "engine.sh"
type: entity
entity_type: tool
aliases: ["engine.sh", "Engine Bridge"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-engine-sh|scripts/engine.sh]]"]
related: []
tags: ["scripts", "bun-runtime", "layer-4"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# engine.sh

Thin bash bridge from Layer 4 hooks and agents to the Bun-based TypeScript engine.

## Overview

`scripts/engine.sh` is the single entry point through which every Layer 4 bash script invokes the TypeScript engine. It checks for Bun availability, prefers the pre-built `dist/cli.js` over running source directly, and degrades gracefully when Bun is absent.

## Key Facts

- Resolves the plugin root from `CLAUDE_PLUGIN_ROOT` env var or from the script's own directory.
- Prefers `dist/cli.js` (the npm-install pre-built binary) over `src/cli/cli.ts` (the source run via Bun).
- When Bun is absent, prints a WARN to stderr and exits 0 so hot-path hooks do not hard-fail.
- All verb commands (`verify`, `fix`, `heal`, `lint`, `snapshot`, `hook`, etc.) are passed through to the engine.
- The fail-open behavior (exit 0 on missing Bun) is intentional for advisory hooks; security gates implement their own fail-closed logic on top.

## Related

See the security hooks (firewall.sh, protect-raw.sh, validate-frontmatter.sh) for how each one adds its own Bun-absent fail-closed behaviour on top of this bridge.
