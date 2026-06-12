---
title: "ADR-0003 Polish Agent"
type: concept
aliases: ["ADR-0003 Polish Agent", "ADR-0003", "polish agent ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0003-polish-agent-and-obsidian-side]]"]
related: ["[[Polish Agent]]", "[[Agents Layer]]", "[[ADR-0001 Four-Layer Orchestrator]]"]
tags: [adr, agents, obsidian]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0003: Polish Agent — Centralise the Obsidian-Side Experience

**Status:** Proposed | **Date:** 2026-05-02

## Problem

The Obsidian-side experience (graph view colors, vault MOC, per-folder `_index.md` consistency) was scattered across three places: the ingest agent (Step 1.7 graph colors, Step 1.8 index updates), the curator agent (MOC consistency intermittently), and the standalone `llm-wiki-index` skill. Three observable problems:

1. **Drift** — ingest appends to the index; the index skill rebuilds from scratch. Running them in different orders produces inconsistent page counts.
2. **Graph colors only run on ingest** — a curator-only run that creates a new top-level folder leaves it uncolored.
3. **No one place to test the Obsidian-side invariants.**

## Decision

Add a fourth Layer 3 specialist: `claude-wiki-pages-polish-agent` (`user-invocable: false`). It owns three idempotent steps:

1. **Graph colors** — apply per-topic colors via `obsidian-graph-colors` skill for any new top-level topic folders.
2. **Index refresh** — regenerate `wiki/index.md` from `_index.md` files with current page counts and last-updated dates.
3. **Vault MOC consistency** — walk every folder under `wiki/`; ensure each `_index.md` `children:` field matches actual `.md` siblings. Append-only; never delete.

The orchestrator fans out the polish agent in parallel with the final-report compose step at the tail of every successful ingest or curator run.

## Key Alternatives Rejected

- **Keep work distributed** — status quo; the drift problem and graph-colors gap are the reasons this ADR exists.
- **Add work to the orchestrator** — violates layering (orchestrators dispatch; specialists do).
- **Make it a skill** — three responsibilities run together are agent-appropriate; a skill is single-responsibility.

## Consequences

- One place owns the Obsidian-side invariants.
- The ingest agent shrinks (Steps 1.7 and 1.8 collapse to a one-line note pointing at polish).
- Polish failure does not block a successful ingest from being reported.
- A Tier 1 test can assert post-polish invariants in one place.
