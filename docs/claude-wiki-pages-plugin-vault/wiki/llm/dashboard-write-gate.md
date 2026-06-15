---
title: "Dashboard Write Gate"
type: concept
aliases: ["Dashboard Write Gate", "dashboard write gate", "dashboard gate", "dashboard approval gate"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[llm-analyst-modes-skill|Analyst Modes Skill (SKILL.md)]]", "[[plugin-analyst-agent|Analyst Agent Source]]"]
related: ["[[analyst-agent|Analyst Agent]]", "[[analyst-dashboard-mode|Analyst Dashboard Mode]]", "[[git-checkpoint|Git Checkpoint]]", "[[draft-review-surface|Draft Review Surface]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "analyst", "write-gate", "safety"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Dashboard Write Gate

## Definition

The Dashboard Write Gate is the approval gate that the [[analyst-agent|Analyst Agent]] must pass before writing to `vault/wiki/dashboard.md`. Writing to `dashboard.md` overwrites a live-wiki file that participates in frontmatter validation and the Obsidian graph — it is therefore a semi-destructive operation that requires explicit human confirmation. Static snapshots written to `vault/output/<name>.md` do not require this gate.

The gate applies exclusively to the `dashboard.md` target. Any other [[analyst-dashboard-mode|Analyst Dashboard Mode]] output — static markdown tables, CSV files, output folder files — is ungated.

## Key Principles

**Why the gate exists.** `vault/wiki/dashboard.md` is a live wiki file: it is indexed, validated against the schema, and visible in the Obsidian graph. An unchecked write can overwrite an existing dashboard, introduce a schema-invalid frontmatter block, or create a page with broken wikilinks — all of which require curator intervention to fix. The gate makes the consequence explicit before any write occurs.

**The four-step gate protocol:**

1. Write a plan to `vault/output/_dashboard-plan-YYYY-MM-DD.md` containing:
   - Proposed scope, format (Dataview vs. static), and metrics to be computed.
   - Proposed frontmatter for `dashboard.md` (following `vault/CLAUDE.md` schema).
   - Full body preview, including every Dataview query.
   - Diff summary vs. the current `dashboard.md` (which sections change).
2. Ask the user for one of: **approve** / **edit-then-approve** / **abort**.
3. Only on explicit approval, write to `vault/wiki/dashboard.md`.
4. Append to `vault/wiki/log.md` with operation type `dashboard`.

**Abort behavior.** On abort, the gate stops — no write occurs, no log entry for the dashboard operation. The plan file in `vault/output/` remains as an artifact.

**Contrast with the Synthesis-write gate.** The Synthesis-write gate governs writes to `vault/wiki/_synthesis/`. Both gates follow the same plan-then-confirm protocol, but they protect different targets. The Synthesis-write gate also requires a post-write citation re-verify step; the Dashboard Write Gate does not mandate citation re-verify (Dataview queries do not use wikilinks for citation purposes).

## Examples

A typical gated dashboard flow:

```
Analyst: Planning to write dashboard.md with Dataview queries for coverage + health metrics.
→ Writing plan to vault/output/_dashboard-plan-2026-06-13.md ...
→ Plan written. Please approve / edit-then-approve / abort.

User: approve

Analyst: Writing vault/wiki/dashboard.md ... Done. Appended to wiki/log.md.
```

## Related Concepts

- [[analyst-dashboard-mode|Analyst Dashboard Mode]] — Mode 2; the gate governs writes produced by this mode
- [[analyst-agent|Analyst Agent]] — the agent that enforces this gate
- [[draft-review-surface|Draft Review Surface]] — the analogous gate in the engine for draft promotion into `wiki/`
- [[git-checkpoint|Git Checkpoint]] — snapshot pre/post wraps ingest writes; the Dashboard Write Gate is a human-in-the-loop complement to the git safety net
