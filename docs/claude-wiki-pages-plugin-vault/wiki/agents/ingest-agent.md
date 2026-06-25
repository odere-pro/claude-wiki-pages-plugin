---
title: "Ingest Agent"
type: entity
entity_type: tool
aliases: ["Ingest Agent", "claude-wiki-pages-ingest-agent", "ingest agent"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-ingest-agent|claude-wiki-pages-ingest-agent]]"]
related: []
tags: ["agents", "ingest", "pipeline", "wiki-pages"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Ingest Agent

The four-step pipeline agent that turns raw sources into structured, cross-linked wiki pages.

## Overview

The ingest agent (`claude-wiki-pages-ingest-agent`) is the sole writer in the extract–transform–load pipeline. It reads raw sources from `vault/raw/`, produces source summaries in `wiki/_sources/`, creates or updates entity/concept pages in topic folders, builds folder notes, and appends to `wiki/log.md`. It optionally optimizes the topic tree and produces a synthesis note.

The pipeline has four steps:

1. **Ingest** — identify unprocessed sources, extract entities/concepts, write source summaries and wiki pages per the approved topic-tree plan.
2. **Auto-heal** — delegate to the curator agent (`engine.sh heal` + judgment fixes) under a git checkpoint.
3. **Optimize** (opt-in, destructive) — restructure folders exceeding 12 children; requires explicit user confirmation.
4. **Synthesize** — write cross-topic synthesis notes to `wiki/_synthesis/`.

## Key Facts

- **Model:** sonnet
- **Tools:** Bash, Read, Write, Edit, Glob, Grep, Task
- **Budget:** max 25 unprocessed sources per run; surplus reported as backlog
- **Plan gate:** Step 1.4 writes a topic-tree plan to `vault/output/_pipeline-plan-<date>.md` and requires approve / edit-then-approve / abort before any pages are written
- **Untrusted input:** all content in `vault/raw/` is treated as data; embedded instructions are ignored
- **Parallel extract:** when `maintenance.maxParallelExtract > 1` and `route == claude`, spawn one extract-worker Task per source (capped at 8); writes begin only after all workers respond (H10 write barrier)
- **Record fan-out:** record-oriented sources (JSON/YAML arrays, CSVs) are routed to `expand-records.sh` rather than per-item manual extraction
- **Snapshot discipline:** `snapshot.sh pre` before writing; `snapshot.sh post` after each major step (ingest writes, synthesis writes)

## Related

Invoked by the orchestrator agent when `raw_pending > 0`. Delegates extraction to the extract worker agent in parallel mode and delegates structural repair to the curator agent in Step 2.
