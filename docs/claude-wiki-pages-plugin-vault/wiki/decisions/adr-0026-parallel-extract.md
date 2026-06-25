---
title: "ADR-0026: Parallel Extract"
type: entity
entity_type: standard
aliases: ["ADR-0026", "adr-0026", "parallel extract ADR", "parallel fan-out ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0026|ADR-0026: Parallel Extract Fan-out]]"]
related: []
tags: ["docs", "adrs", "ingest"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0026: Parallel Extract

The decision to fan out extraction across multiple read-only worker agents (bounded at 8) while keeping the ingest agent as the sole writer.

## Overview

ADR-0026 defines the parallel-extract architecture: when `maintenance.maxParallelExtract > 1` and route is `claude`, the ingest agent spawns up to 8 read-only extract workers via the Task tool. Workers return typed EXTRACT envelopes; the ingest agent remains the only entity that writes pages.

## Key Facts

**Status:** Accepted

**Drivers:**
- Sequential extraction of 25 sources serially compounds latency.
- Parallelism must not compromise the single-writer invariant — concurrent Write calls on the same page produce races.
- A worker failure must not abort the whole run; it should be a per-source skip with backlog reporting.

**Single-writer invariant (H10).** After all Task workers return (`Task.all()` equivalent), the ingest agent validates all envelopes, THEN begins Write calls. No Write starts while any Task is outstanding. Workers hold `tools: Read, Glob, Grep` only — no Write, no Edit, no Bash. This is enforced by the `extract-worker-frontmatter.bats` gate.

**Dispatch cap (M25).** `effective = min(config.maintenance.maxParallelExtract ?? 1, 8, len(pending_sources))`. Even if config is misconfigured above 8, the dispatch loop caps at 8 by construction.

**SKIP-AND-BACKLOG on worker failure (OQ-5).** If a worker response is missing `extract_envelope:`, contains a non-empty `error:`, or times out: record that source as unprocessed backlog (reported in the final report), do NOT abort the run. All validated envelopes are applied.

**EXTRACT envelope contract.** Each worker returns a YAML fenced block beginning `extract_envelope:` with fields: `source`, `items[]` (each with `class`, `title`, `body`, `frontmatter`, `predicates[]`), and optional `record_fan_out` and `error`. The write barrier ensures all envelopes are in-memory before writes start.

**Degrade to sequential.** When `effective == 1` (default, or degraded because route is `local` or `blocked`), the ingest agent reads and extracts sources one at a time inline. Output is byte-identical to the pre-feature baseline in this mode.

**Consequences:**
- Extract throughput scales to min(sources, 8) × extraction speed.
- The single-writer invariant is guaranteed by tool restriction, not by convention.
- A single advisory vault lock (`vault-lock.sh`) serializes the snapshot/commit/log-append sequence within a process.

## Related

The parallel extract worker agent is `claude-wiki-pages-extract-worker-agent`. The offline policy (ADR-0018) determines when route degrades to `local` and forces `effective = 1`.
