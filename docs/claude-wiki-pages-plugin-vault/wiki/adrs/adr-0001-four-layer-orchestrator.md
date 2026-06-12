---
title: "ADR-0001 Four-Layer Orchestrator"
type: concept
aliases: ["ADR-0001 Four-Layer Orchestrator", "ADR-0001", "four-layer orchestrator ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0001-four-layer-orchestrator]]"]
related: ["[[Four-Layer Stack]]", "[[Orchestrator Agent]]", "[[ADR-0002 Agent Naming Convention]]"]
tags: [adr, orchestration, architecture]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0001: Four-Layer Orchestrator

**Status:** Proposed | **Date:** 2026-05-02

## Problem

The plugin previously had a flat namespace of 13 skills and 3 agents, with no top-level "do the right thing" verb. Users had to manually chain four to five commands: scaffold → ingest → audit → repair → verify. Two failure shapes resulted:

1. **Drop-out after init** — users scaffolded a vault but stopped because the wizard ended with "you're set up" instead of immediately ingesting.
2. **Manual chain fragility** — users who found the pipeline ran it once, then forgot to run lint-fix on the next session. Drift accumulated silently.

## Decision

Adopt a single top-level orchestrator that mirrors the four-layer dispatch pattern:

- **L4** — `commands/wiki.md` — one slash command (`/claude-wiki-pages:wiki`) delegates to the orchestrator agent via `Task`.
- **L4** — `commands/doctor.md` — environment health check.
- **L3** — `claude-wiki-pages-orchestrator-agent` — probes vault state and dispatches to the right specialist. The dispatch table is auditable.
- **Specialists** — marked `user-invocable: false`. They must not re-probe state; the orchestrator owns that.

The user's mental model collapses to one verb: `/claude-wiki-pages:wiki`. The plugin figures out the rest.

## Key Alternatives Rejected

- **Add an orchestrator agent without a slash command** — rejected because the slash command is the discoverable surface.
- **One omnibus agent** — rejected because single-responsibility skills are testable in isolation.
- **Make every skill chain its successor** — rejected because chaining inside skills violates the L2 testability boundary.

## Consequences

- One verb to teach, one verb to demo.
- The state probe replaces user memory.
- Power users can still bypass the orchestrator and invoke specialists directly.
- The `NEXT_STEP:` trailing line from the init wizard is now load-bearing (tested in Tier 1 Bats).
