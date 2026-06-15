---
title: "route.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "routing", "offline"]
aliases: ["route.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# route.ts Source

## Summary

`src/commands/route/route.ts` implements the deterministic degraded-mode routing decision (ADR-0018). `decideRoute()` is a pure function that takes `offlinePolicy`, `claudeReachable`, `tierApproved`, and `ollamaUp` and returns a `RouteDecision` (`"claude" | "local" | "blocked"`) with a reason string. The command never probes the network — reachability is an input from scripts/reachability.sh. A BLOCKED decision emits an error-severity finding so `exitCode()` returns 1 (fail-closed).

## Key Claims

- `decideRoute()` is pure and network-free; it implements the 7-row decision matrix from ADR-0018.
- Default Claude reachability assumption is "reachable" (unprobed = prefer primary); default Ollama is "not-up".
- `offlinePolicy: "off"` → always claude; `"strict"` → claude or blocked; `"prefer-local"` → claude or local or blocked.
- A tier is usable only when `localModel.enabled` AND `checkLocalModelApproval()` returns no errors.
- BLOCKED is an error-severity finding so the command exits 1 (fail-closed).
- `RouteReport` extends `Report` with `decision`, `reason`, `tier`, `offlinePolicy` fields.
