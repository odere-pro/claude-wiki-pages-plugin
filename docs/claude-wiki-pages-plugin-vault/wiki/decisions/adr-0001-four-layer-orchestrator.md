---
title: "ADR-0001: Four-Layer Orchestrator"
type: entity
entity_type: standard
aliases: ["ADR-0001", "adr-0001", "four-layer orchestrator ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0001|ADR-0001: Four-Layer Orchestrator]]"]
related: []
tags: ["docs", "adrs", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0001: Four-Layer Orchestrator

The founding decision that organizes the plugin as a four-layer stack (Data / Skills / Agents / Orchestration) with a single top-level orchestrator as the only advertised entry point.

## Overview

ADR-0001 establishes the four-layer architecture as the plugin's structural backbone. Every subsequent ADR operates within this framework without modifying the layer boundaries.

## Key Facts

**Status:** Accepted

**Drivers:**
- A single-file skill is too easy to accidentally break; layering catches a different failure class at each level.
- Users should invoke one entry point (the orchestrator); routing to the right specialist should be invisible.
- The Data layer must be immutable so provenance is unambiguous.

**Decision:** Organize the plugin as four strictly separated layers, each with a single responsibility:

| Layer | Directory | Responsibility |
| --- | --- | --- |
| 1 — Data | `skills/init/template/` | Immutable `raw/`, LLM-maintained `wiki/`, schema in `CLAUDE.md`. Passive. |
| 2 — Skills | `skills/` | 26 single-responsibility capabilities (short verbs + teaching skills + reference) |
| 3 — Agents | `agents/` | 8 multi-step executors owned by the orchestrator |
| 4 — Orchestration | `commands/`, `hooks/`, `scripts/`, `rules/` | Slash commands, hook wiring, script implementations |

**Orchestrator-first invariant.** `/claude-wiki-pages:wiki` is the one advertised verb. The orchestrator probes vault state and dispatches to the right specialist. Power users may call specialists directly; the docs only advertise the orchestrator.

**Consequences:**
- Adding a new capability means adding a skill, then optionally wrapping it in an agent, then wiring the agent to the orchestrator's dispatch table — three touch points, each constrained by the layer contract.
- The Data layer is immutable by construction, so `protect-raw.sh` can block writes unconditionally.

## Related

The four-layer architecture is documented in full in `docs/architecture.md`. The hook event table and dispatch rules are in `docs/operations.md`.
