---
title: "scripts/engine.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/engine.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/engine.sh

## Summary

Thin bash bridge from hooks and agents to the Bun-based TypeScript engine. When Bun is present it delegates to `dist/cli.js` (pre-built npm install) or `src/cli/cli.ts` (source run). When Bun is absent it prints a WARN and exits 0 so hot-path hooks degrade gracefully rather than hard-failing.

## Key Claims

All layer-4 scripts invoke the engine through this single entry point. Presence of `dist/cli.js` is preferred over direct TS execution. Fail-open behavior (exit 0 on missing Bun) is intentional for hooks; security gates that need fail-closed override this at their own level.

Covers: Engine Bridge, Bun Runtime Requirement, Graceful Degradation
