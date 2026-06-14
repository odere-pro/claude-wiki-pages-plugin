---
title: "Single-Pass Dispatch"
type: concept
aliases:
  [
    "Single-Pass Dispatch",
    "single-pass dispatch",
    "single-pass routing",
    "dispatch contract",
    "one specialist rule",
  ]
parent: "[[Plugin]]"
path: "plugin"
sources: ["[[Orchestrator Agent Source]]"]
related:
  [
    "[[Orchestrator Agent]]",
    "[[Agent Contract Table]]",
    "[[Ingest Agent]]",
    "[[Curator Agent]]",
    "[[Analyst Agent]]",
  ]
contradicts: []
supersedes: []
depends_on: []
tags: ["orchestrator", "dispatch", "pattern"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Single-Pass Dispatch

## Definition

Single-Pass Dispatch is the orchestrator's core behavioral invariant: for any given invocation of `/claude-wiki-pages:wiki`, exactly one specialist is dispatched. The routing table is walked top-to-bottom; the first matching row wins; no second specialist is called in the same turn. The orchestrator never recurses, never fans out on ambiguity, and never chains specialists.

## Key Principles

**The dispatch table** has nine rows evaluated in priority order:

1. No vault or no `schema_version` → onboarding wizard
2. Explicit project-intake intent + git work tree → ingest agent (with `wire_project: true`)
3. `maintenance.enabled` + `needs_catchup` → maintenance agent
4. Pending drafts in `_proposed/` → review gate
5. `raw_pending > 0` + `degraded.decision == "blocked"` → surface route error (no fan-out)
6. `raw_pending > 0` + `degraded.decision == "local"` → draft skill (offline path)
7. `raw_pending > 0` → ingest agent
8. `last_log_entry == "ingest"` (lint never ran after previous ingest) → curator agent
9. Analytical prompt (`what`, `why`, `compare`, `summarize`, …) → analyst agent

Any other state → ask one clarifying question (no fan-out).

**Why this order:** bootstrap before explicit project-intake before maintenance before query. A user who asks an analytical question against a vault with pending sources gets ingest first — their question is more useful answered against fresh state. They re-run `/claude-wiki-pages:wiki` to get the answer.

**The single exception:** after the chosen specialist returns successfully, the orchestrator fans out the polish agent as a tail-of-write step. Polish is not a "second specialist" in the routing sense — it is always a tail step for write-path specialists (ingest, curator), not a decision branch.

**Default-on-ambiguity:** when the routing is unclear, the orchestrator asks one clarifying question and stops. It never guesses a specialist, because an incorrect dispatch (e.g., running ingest when the user wanted to query) wastes resources and may produce unwanted writes.

## Examples

If a user runs `/claude-wiki-pages:wiki what does the wiki say about the Firewall?` but there are five unprocessed files in `raw/`, the orchestrator dispatches the ingest agent (row 7), not the analyst. The user sees the ingest result immediately and can re-run to get their answer against the now-fresh wiki.

If a user runs `/claude-wiki-pages:wiki` with no argument and the vault is fully up to date (no pending sources, last log entry was lint), the table falls through all nine rows and the orchestrator asks one clarifying question.

## Related Concepts

- [[Agent Contract Table]] — the per-agent contract table where the halting condition is declared
- [[Orchestrator Agent]] — the agent that implements this dispatch pattern
- [[Ingest Agent]] — most commonly dispatched specialist
