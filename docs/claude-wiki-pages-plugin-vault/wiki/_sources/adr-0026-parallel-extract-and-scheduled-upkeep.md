---
title: "ADR-0026: Bounded Parallel Extract and Scheduled Upkeep"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-15
tags: ["adr", "parallel", "extract", "scheduled", "maintenance", "upkeep"]
aliases: ["ADR-0026: Bounded Parallel Extract and Scheduled Upkeep", "ADR-0026"]
sources: []
created: 2026-06-15
updated: 2026-06-15
status: active
confidence: 1.0
---

# ADR-0026: Bounded Parallel Extract and Scheduled Upkeep

## Summary

Introduces two improvements without weakening any §5 non-negotiable: (A) bounded map-only parallel extract inside the ingest specialist — read/extract workers fan out in parallel, a single sequential writer owns all dedup and `log.md` append; (B) host-owned scheduled upkeep via `scripts/maintenance-run.sh` — a thin wrapper the host OS/cloud cron invokes, with a strict unattended contract that routes uncertain output to `_proposed/`, never auto-promotes drafts.

## Key Claims

- Parallelism lives INSIDE the already-selected ingest specialist, below the orchestrator's one-fan-out rule. The orchestrator contract is UNCHANGED.
- The extract worker (`claude-wiki-pages-extract-worker-agent`) has `tools: Read, Glob, Grep` only — no Write, no Edit, no Bash. Read-only invariant is enforced by tool frontmatter + a Tier-1 grep gate.
- A typed EXTRACT envelope is the only thing a worker returns: `{sourceSummary, keyClaims[], entities[], concepts[], predicates[]}` with claim-level `source`/`quote`/`derived`/`confidence`.
- A SINGLE sequential writer owns ALL dedup/coalesce using the PR-#29 string-identity alias/title resolver — never similarity, never vectors (NO-RAG guard + determinism mechanism).
- One opt-in knob: `maintenance.maxParallelExtract` (default 1, min 1, max 8). Default 1 is byte-identical to pre-ADR behavior. Out-of-range values clamp to `[1,8]`.
- Scheduling mechanism: `scripts/maintenance-run.sh` (new) — resolves one vault, runs the maintenance loop, writes no cron and no vault content itself. The plugin ships no durable routine.
- `maintenance.unattended` (default false): `derived:true` OR `confidence<0.8` routes to `_proposed/`, never auto-promoted. Non-trivial topic-tree plan (creates new top-level folder or moves/renames) aborts with an `ingest-aborted` log entry.
- Default scheduled run touches no network. `maintenance.syncWiredOnRun` (default false) is a separate opt-in for wired-source sync.

## Entities Mentioned

- [[Ingest Agent]]
- [[Maintenance Agent]]
- [[Orchestrator Agent]]

## Concepts Covered

- [[Parallel Extract]]
- [[Scheduled Upkeep]]
- [[Maintenance Loop]]
- [[Ingest Pipeline]]
- [[Draft Review Surface]]

## Grounded Pages

Wiki pages that cite this source:

- [[Parallel Extract]] — primary decision page (new)
- [[Scheduled Upkeep]] — host-owned maintenance scheduling (new)
- [[Maintenance Loop]] — unattended contract, bounded run, `_proposed/` gate
- [[Ingest Agent]] — parallel extract integration
- [[Draft Review Surface]] — `_proposed/` channel role in unattended mode
