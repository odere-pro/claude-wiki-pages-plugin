---
title: "ADR-0034: Bun Required"
type: entity
entity_type: standard
aliases: ["ADR-0034", "adr-0034", "bun required ADR", "bun runtime ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0034|ADR-0034: Bun >= 1.2 Required Runtime]]"]
related: []
tags: ["docs", "adrs", "tooling"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0034: Bun Required

The decision that Bun >= 1.2 is a hard runtime requirement for the deterministic engine, with a defined degraded path for environments without it.

## Overview

ADR-0034 formalizes the Bun requirement that was implicit since the TypeScript engine (`src/`) landed. It defines exactly what works without Bun (bash hook scripts, basic verify), what fails (all engine TS commands), and what the user sees (a clear error, not a silent failure).

## Key Facts

**Status:** Accepted

**Drivers:**
- The engine CLI (`src/cli.ts`) is TypeScript compiled to `dist/cli.js`. Running it requires a JS runtime. Node.js works but requires a separate install and a compiled build step (`bun build`). Bun runs `.ts` directly without a build step, so the source and the runtime artifact are the same file.
- Bun's speed (import warm-up ~10 ms vs Node's ~150–400 ms) matters for the hook-fired scripts that run on every Write and Edit.
- Bun's package manager is a strict superset of npm — no `package-lock.json` conflicts.

**Decision:**
- Bun >= 1.2 is required.
- `scripts/engine.sh` checks for Bun at start; if absent, prints `DEGRADED: Bun not found — engine commands unavailable` and exits 1 (hooks still run as pure bash; bash-only paths like `protect-raw.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh` work without Bun).
- Doctor check D06 flags missing Bun as a FAIL (auto-fixable with `--fix`: runs `curl -fsSL https://bun.sh/install | bash`).
- `SessionStart` hook prints a one-time advisory if Bun is missing.

**What works without Bun:**
- All hook scripts that are pure bash (PreToolUse protection, PostToolUse reminders)
- `verify-ingest.sh` (bash twin of the engine verify verb)
- `git` checkpoint operations
- Doctor checks D01–D05 and D07–D10

**What fails without Bun:**
- `engine.sh backlog`, `engine.sh heal`, `engine.sh route`, `engine.sh config`, `engine.sh okf`, `engine.sh context`
- Full parallel-extract fan-out (engine `route` unavailable → degraded sequential)

## Related

ADR-0035 (Deterministic Obsidian) also uses Bun for its `obsidian eval` path. The install guide documents the one-command Bun install.
