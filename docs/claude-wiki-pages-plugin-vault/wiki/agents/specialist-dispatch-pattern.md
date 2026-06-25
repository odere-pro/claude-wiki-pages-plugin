---
title: "Specialist Dispatch Pattern"
type: concept
aliases: ["Specialist Dispatch Pattern", "specialist dispatch", "single-specialist-per-invocation"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-orchestrator-agent|claude-wiki-pages-orchestrator-agent]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["agents", "orchestration", "architecture", "dispatch"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 0.9
---

# Specialist Dispatch Pattern

The architectural rule that exactly one specialist agent handles any given user invocation — the orchestrator probes, routes once, and composes the result.

## Definition

The specialist dispatch pattern governs how claude-wiki-pages responds to every `/claude-wiki-pages:wiki` invocation. The orchestrator agent probes vault state, walks a top-to-bottom decision table, and dispatches the first matching row as a single `Task` call. It never fans out to two specialists for the same trigger and never re-routes after a specialist returns.

The only sanctioned multi-agent sequence per invocation is the **polish tail-of-write**: after the ingest agent or curator agent completes successfully, the orchestrator calls the polish agent as a second, fixed tail step.

## Key Principles

- **One specialist per trigger.** A single invocation runs at most one write-path specialist plus the polish tail. Two write-path specialists never run in the same turn.
- **No fallback chains.** If a specialist returns an error, the orchestrator surfaces it and stops. The user re-invokes `/claude-wiki-pages:wiki` to retry — no automatic retry or chaining.
- **Orchestrator owns vault resolution.** The vault path is resolved once by the orchestrator and passed to specialists; specialists trust the payload and do not re-probe vault state.
- **Specialists are bounded.** Each specialist agent defines its own budget, halting condition, and retry cap. The orchestrator does not loop over specialist outcomes.
- **State mutation is isolated.** The orchestrator is read-only. All vault writes happen inside specialists, each under their own git checkpoint.

## Examples

A user drops three files into `vault/raw/` and runs `/claude-wiki-pages:wiki`. The orchestrator probes `raw_pending == 3`, matches the `raw_pending > 0` row, dispatches the ingest agent, waits for it to return, then dispatches the polish agent as the tail step. No other specialists run in that invocation.

A user runs `/claude-wiki-pages:wiki "what does the wiki say about routing?"`. The orchestrator probes `raw_pending == 0`, matches the analytical-verb row, dispatches the analyst agent. No write-path specialist runs; polish is skipped (analyst is read-mostly).

## Related Concepts

The specialist dispatch pattern is the operational contract underlying the four-layer stack's Layer 3 (Agents). It prevents the hairball of chained agents that would emerge if specialists could call other write-path specialists directly.
