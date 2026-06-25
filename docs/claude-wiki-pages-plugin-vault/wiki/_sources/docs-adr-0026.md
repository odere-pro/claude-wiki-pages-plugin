---
title: "ADR-0026: Parallel Extract and Scheduled Upkeep"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-25
tags: ["docs", "adr", "ingest"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0026: Parallel Extract and Scheduled Upkeep

## Metadata

- File: `raw/repo/docs/adr/ADR-0026-parallel-extract-and-scheduled-upkeep.md`
- Status: Accepted

## Summary

Two improvements: bounded map-only parallel extract (the read+extract half is parallel; write stays serial) and host-owned scheduled upkeep via maintenance-run.sh. Both opt-in, default to byte-identical behavior. Orchestrator's one-Task-per-invocation contract unchanged.

## Key Claims

Parallelism lives inside the ingest specialist, below the orchestrator's one-fan-out rule. Extract worker is a separate read-only agent (tools: Read, Glob, Grep — no Write/Edit/Bash) enforced by Tier-1 grep gate. Extraction runs BEFORE Step 1.4 plan gate so the plan can enumerate merged entities. Workers return a typed EXTRACT envelope only: {sourceSummary, keyClaims[], entities[], concepts[], predicates[]}. Write barrier (H10): all workers must respond before any Write tool call. Single sequential writer owns all dedup and the sole wiki/log.md append. Cap: maxParallelExtract (default 1 = byte-identical), clamps to [1,8]. Worker failure (OQ-5): skip-and-backlog on missing envelope, error field, or timeout — never abort run. Scheduled upkeep: host-owned OS/cloud cron invoking maintenance-run.sh; plugin creates no cron; durable scheduling belongs to host. Config-home distinction: three distinct files each with one job (config.ts + schema, .claude/claude-wiki-pages.json runtime override, .claude/claude-wiki-pages/settings.json vault resolution).

Covers: Parallel Extract, EXTRACT Envelope, Scheduled Upkeep, maintenance-run.sh, Write Barrier
