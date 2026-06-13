---
title: "Orchestrator Agent"
type: entity
entity_type: tool
aliases: ["Orchestrator Agent", "orchestrator agent", "claude-wiki-pages-orchestrator-agent", "orchestrator"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[ADR-0001: Four-Layer Orchestrator]]", "[[ADR-0002: Agent Naming Convention]]", "[[Operations Guide]]"]
related: ["[[Ingest Agent]]", "[[Curator Agent]]", "[[Analyst Agent]]", "[[Polish Agent]]", "[[Maintenance Agent]]", "[[Four-Layer Stack]]", "[[Vault Resolution]]"]
tags: ["agent", "orchestrator"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Orchestrator Agent

> [!summary]
> The `claude-wiki-pages-orchestrator-agent` is the top-level entry agent for `/claude-wiki-pages:wiki`. It is the sole `user-invocable: true` agent. Its one job is a single-pass vault state probe followed by dispatch to exactly one specialist. Specialists never re-probe state — they trust the orchestrator's payload. The user's mental model is one verb: `/claude-wiki-pages:wiki`. The orchestrator figures out the rest.

## Overview

The `claude-wiki-pages-orchestrator-agent` is Layer 3's entry point and dispatch controller. It addresses the drop-out-after-init and manual-chain-fragility failure modes that a flat skill namespace produces: users forget which skill to run next, and drift accumulates silently.

The orchestrator solves this by owning the state probe — a filesystem-only pass that reads `vault/raw/`, `wiki/log.md`, and `wiki/index.md` — and then dispatching to exactly one specialist based on what it finds. The dispatch is not a guess; it follows an auditable routing table.

The agent was added as part of ADR-0001 (the four-layer orchestrator decision) and named under the `{plugin-name}-{role}-agent` convention from ADR-0002.

## Entry Point

```
/claude-wiki-pages:wiki
```

Pass any free-form goal:
- `/claude-wiki-pages:wiki ingest the new papers`
- `/claude-wiki-pages:wiki what does the wiki say about retrieval?`
- `/claude-wiki-pages:wiki` (no argument — orchestrator probes and dispatches)

## State Probe

The probe is filesystem-only and makes no MCP calls, keeping its latency minimal:

1. Check whether a vault exists with a valid `schema_version` in `CLAUDE.md`.
2. List `vault/raw/` recursively (excluding `raw/agent-sessions/`).
3. Read `wiki/log.md` to extract the set of ingested source titles.
4. Check whether the log's last entry is a lint entry or an ingest entry.
5. Read the user's prompt for analytical verb signals (`what`, `why`, `compare`, `how`, `which`, `summarize`).
6. Check for pending drafts in `vault/_proposed/`.
7. Check `maintenance.enabled` config and run `engine backlog` if it is true.

This sequence runs once and produces the dispatch payload.

## Routing Table

| State found | Specialist dispatched |
| --- | --- |
| No vault or no `schema_version` | Onboarding wizard (scaffold + orient) |
| Files in `raw/` not in `wiki/log.md` | [[Ingest Agent]] |
| Previous ingest not followed by lint | [[Curator Agent]] (audit-and-repair) |
| Analytical prompt (`what`, `why`, `compare`, …) | [[Analyst Agent]] |
| Pending drafts in `_proposed/` | Review gate |
| `maintenance.enabled` + backlog | [[Maintenance Agent]] |

Priority goes top to bottom: if raw files are pending AND the prompt is analytical, the ingest takes precedence (stale sources degrade the answer quality anyway).

When the state is ambiguous — for example, the user says "look at the new papers" but it is unclear whether they want ingest or query — the orchestrator asks one clarifying question. It never fans out on ambiguity.

## Specialist Constraint

Specialists `user-invocable: false` agents must not re-probe vault state. They receive the orchestrator's state probe payload and trust it. This is a deliberate constraint (ADR-0001): re-probing inside a specialist would be redundant work and would create two sources of truth for vault state within a single turn.

The constraint is encoded in each specialist's agent file as a note: "The orchestrator owns state probing; do not re-derive it."

## Polish as Tail Step

After every successful ingest or curator pass, the orchestrator fans out the [[Polish Agent]] in parallel with the final-report compose step. The user sees the ingest/curator result immediately, and the polish step (graph colors, index refresh, folder note reconciliation) runs concurrently.

The polish agent is `user-invocable: false` and has no standalone meaning — it only makes sense as this tail step.

## Why One Verb

ADR-0001 records two failure modes the orchestrator solves:

1. **Drop-out after init.** Users scaffold a vault, get "you're set up," and stop — because the wizard ends without immediately processing whatever is in `raw/`. The orchestrator finds the pending sources and ingests them on the first real run.

2. **Manual chain fragility.** Users who know the pipeline run it once, then forget to lint on the next session. Drift accumulates silently because there is no default verb that re-probes state. The orchestrator's state probe replaces user memory: a user who hasn't touched the vault in three months runs `/claude-wiki-pages:wiki`, the orchestrator finds unprocessed sources and missing lint, and the right specialists run automatically.

The latency cost of the orchestrator hop is one filesystem probe — acceptable given the alternative is the user picking the wrong specialist by hand.

## Power-User Bypasses

When the routing is known in advance and the probe is wasted work:

| Bypass | When to use |
| --- | --- |
| `/claude-wiki-pages:claude-wiki-pages-ingest-agent` | Scripted batch ingest |
| `/claude-wiki-pages:claude-wiki-pages-curator-agent` | Direct audit-and-repair without ingest |
| `/claude-wiki-pages:claude-wiki-pages-analyst-agent` | Direct query when routing is unambiguous |
| `/claude-wiki-pages:claude-wiki-pages-polish-agent` | Manual graph/index refresh after a direct agent call |

Bypassing the orchestrator also bypasses the polish tail step. Run `/claude-wiki-pages:claude-wiki-pages-polish-agent` manually afterward if Obsidian sync is needed.

## Related

- [[Ingest Agent]] — dispatched when pending sources exist
- [[Curator Agent]] — dispatched for audit-and-repair
- [[Analyst Agent]] — dispatched for analytical queries
- [[Polish Agent]] — tail-of-write step after ingest or curator
- [[Maintenance Agent]] — dispatched for autonomous backlog catch-up
- [[Four-Layer Stack]] — the orchestrator is Layer 3's user-facing entry
- [[Vault Resolution]] — the resolver the orchestrator uses to find the active vault
