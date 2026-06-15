---
title: "Parallel Extract"
type: concept
aliases: ["Parallel Extract", "parallel extract", "map-only parallel extract", "bounded parallel extract", "maxParallelExtract"]
parent: "[[claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[ADR-0026: Bounded Parallel Extract and Scheduled Upkeep]]"]
related: ["[[Ingest Agent]]", "[[Ingest Pipeline]]", "[[Orchestrator Agent]]", "[[Deterministic Engine]]", "[[Draft Review Surface]]", "[[Git Checkpoint]]"]
contradicts: []
supersedes: []
depends_on: ["[[Ingest Pipeline]]", "[[Ingest Agent]]"]
tags: ["concept", "parallel", "extract", "performance", "ingest"]
created: 2026-06-15
updated: 2026-06-15
update_count: 1
status: active
confidence: 1.0
---

# Parallel Extract

## Definition

Parallel extract is an opt-in performance mechanism that fans out the read+extract phase of ingest across multiple read-only worker agents, while keeping the write phase strictly sequential. It is "map-only" — only the extraction step parallelizes; a single writer owns all deduplication, page creation, and `wiki/log.md` append.

## Architecture

The key invariant: **parallelism lives inside the already-selected ingest specialist**, below the orchestrator's one-fan-out rule. The orchestrator still dispatches exactly one `Task` per invocation; it is the ingest agent that may fan out to extract workers.

```
Orchestrator (one Task)
  → Ingest Agent
      → Extract Worker 1 (Read, Glob, Grep only)
      → Extract Worker 2 (Read, Glob, Grep only)
      → Extract Worker N (Read, Glob, Grep only)
      → Single Sequential Writer (dedup, create/update, log.md append)
```

## Extract Worker Contract

The extract worker (`claude-wiki-pages-extract-worker-agent`) has:
- `tools: Read, Glob, Grep` only — no `Write`, no `Edit`, no `Bash`
- Returns a typed EXTRACT envelope: `{sourceSummary, keyClaims[], entities[], concepts[], predicates[]}` with claim-level `source`/`quote`/`derived`/`confidence`
- Never produces a create/update verdict — that is the writer's role
- Out-of-enum candidates route to `_proposed/` with a logged reason, never written with a guessed heading

The read-only invariant is enforced by **tool frontmatter** (the agent definition) plus a **Tier-1 grep gate** — not a prose promise.

## Sequential Writer

A single writer applies payloads in stable canonical-title / `.pendingRaw[]` order using the string-identity alias/title resolver (never similarity, never vectors — the NO-RAG guard and the determinism mechanism). Coalesce rule:
- Union `sources`/`related`
- `max()` confidence per the reinforce rule
- `derived:true` only if **all** contributors are derived
- One page per canonical entity
- `update_count` incremented exactly once
- The single writer is the **only** appender to `wiki/log.md`

## Configuration

| Field | Default | Range | Behavior |
|---|---|---|---|
| `maintenance.maxParallelExtract` | 1 | 1–8 | Worker count. Default 1 is byte-identical to sequential. Out-of-range values clamp. |

At `maxParallelExtract=1`, output is byte-identical to the pre-ADR sequential path. The feature is gated by a mechanical determinism replay test (shuffle worker returns → assert empty `git diff`, identical `log.md` order, identical lint output).

## Degradation

The `route` degrade single-home emits `parallelExtract:{requested,effective,reason}`. `effective` is never >1 in any degraded tier (`local`/`blocked`/offline/unset → `effective=1`); only a `claude` route yields `effective>1`.

## Related Concepts

- [[Ingest Pipeline]] — the 13-step pipeline that parallel extract accelerates
- [[Ingest Agent]] — the specialist that orchestrates workers
- [[Deterministic Engine]] — determinism property that parallel extract must preserve
- [[Scheduled Upkeep]] — uses parallel extract when `maxParallelExtract>1`
