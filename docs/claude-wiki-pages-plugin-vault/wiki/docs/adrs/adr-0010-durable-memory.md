---
title: "ADR-0010: Durable Memory Carve-Out"
type: entity
entity_type: standard
aliases: ["ADR-0010", "adr-0010", "durable memory ADR", "agent session memory"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0010|ADR-0010: Durable Memory Carve-Out]]"]
related: []
tags: ["docs", "adrs", "architecture", "memory"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0010: Durable Memory Carve-Out

Defines the sanctioned path for agent session memory: write to `raw/agent-sessions/` as `source_type: agent-session` on `Stop`/`SessionEnd`, letting the normal ingest pipeline pick it up without bypassing the provenance gate.

## Overview

ADR-0010 solves the agent memory problem within the constraints of the plugin's raw-immutability rule. Instead of writing session context directly to `wiki/`, the carve-out writes to `raw/agent-sessions/` (an exception to the "raw is immutable" rule, sanctioned here). The next ingest cycle ingests it like any other source.

## Key Facts

**Status:** Accepted

**Trigger:** When `CLAUDE_WIKI_PAGES_SESSION_SCRATCH` is set, the `Stop`/`SessionEnd` hook calls `session-memory.sh`.

**Write target:** `raw/agent-sessions/<session-id>.md` with `source_type: agent-session`.

**Idempotency:** The session id is stable for the session duration. Re-running `session-memory.sh` for the same session id overwrites the same file — no duplicate sources.

**Pipeline path:** The written file is a normal raw source. It is NOT promoted to `wiki/` directly — it goes through the `_proposed/` gate or the next maintenance ingest. The provenance chain is preserved.

**Lazy behavior:** If `CLAUDE_WIKI_PAGES_SESSION_SCRATCH` is not set, `session-memory.sh` is a no-op.

**Consequences:**
- Agents get durable memory across sessions without breaking the raw-immutability rule.
- The carve-out is documented as the "protect-raw sanctioned exception" in the hooks contract.
- Human review (via `_proposed/` promotion) remains in the loop before session memory becomes wiki content.

## Related

The protect-raw hook (`protect-raw.sh`) has the carve-out baked in for `raw/agent-sessions/`. ADR-0005 (git required) provides the history that makes idempotent session replay detection possible.
