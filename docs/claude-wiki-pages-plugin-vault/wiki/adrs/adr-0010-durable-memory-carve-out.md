---
title: "ADR-0010 Durable Memory Carve-Out"
type: concept
aliases: ["ADR-0010 Durable Memory Carve-Out", "ADR-0010", "durable memory ADR", "agent-session source"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0010-durable-memory-carve-out]]"]
related: ["[[Hook System]]", "[[Draft Review Gate]]", "[[Canonical Terms]]"]
tags: [adr, memory, provenance, hooks]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0010: Durable Memory Carve-Out

**Status:** Accepted | **Date:** 2026-06-05

## Problem

Durable memory needs an agent to persist a session learning so the next session can build on it. But `raw/` is append-only and hook-protected — `protect-raw.sh` blocks every `Edit` to existing files and every `Write` that would overwrite one. Brief §5 permits exactly one exception, but only as a narrowly scoped, sanctioned carve-out. Two failure shapes had to be designed out:

1. **Provenance laundering** — an agent writing a conclusion straight into `wiki/` as a `derived: true` page with no real source would silently break the §7 provenance invariant.
2. **A carve-out that widens** — a marker matched anywhere (not just frontmatter) becomes a general raw-write hole. During adversarial review, a body-marker smuggle attempt was caught and blocked.

## Decision

Permit exactly one automated write under `raw/`, fenced and frontmatter-gated:

**The carve-out:** `protect-raw.sh` permits a `Write` to a **new** file whose canonical path falls under `*/<vault>/raw/agent-sessions/` **and** whose **YAML frontmatter** (lines strictly between the first `---` pair, with `NR==1` guard) declares `source_type: agent-session` (exact anchored match). Everything else fails closed: `Edit` under `raw/` stays blocked; `Write` overwriting any existing `raw/` file stays blocked; a new file without the frontmatter marker is blocked.

**No provenance laundering:** The learning is written as a real `type: source` file carrying `source_type: agent-session`. It enters the wiki only through the one `_proposed/` review gate — ingested into a `_proposed/wiki/...` draft and promoted by `propose approve` under a git checkpoint.

**Schema addition:** `source_type` enum gained `agent-session` (additive; no `migrate` needed).

**Trigger:** Real `Stop` and `SessionEnd` hooks run `scripts/session-memory.sh`. Idempotent per session id; lazy (write + commit only; ingest deferred to next pass).
