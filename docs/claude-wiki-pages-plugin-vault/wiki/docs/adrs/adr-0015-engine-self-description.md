---
title: "ADR-0015: Engine Self-Description Surfaces"
type: entity
entity_type: standard
aliases: ["ADR-0015", "adr-0015", "engine self description ADR", "ICM context surface"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0015|ADR-0015: Engine Self-Description Surfaces]]"]
related: []
tags: ["docs", "adrs", "engine", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0015: Engine Self-Description Surfaces

Adds three read-only engine surfaces (`config --json`, `route --json`, `context --skill <name>`) that let agents query the engine's current configuration and routing decision without side effects.

## Overview

ADR-0015 formalizes the Introspectable Context Model (ICM) contract for the engine. Skills and agents that need to know the current parallelism setting, the degraded mode decision, or the L0–L4 context for a specific skill can query the engine directly rather than reading config files by hand.

## Key Facts

**Status:** Accepted

**Three surfaces:**

| Command | Returns |
| --- | --- |
| `engine.sh config --json` | Resolved config (including `maintenance.maxParallelExtract`, `degraded.*`) |
| `engine.sh route --json` | Routing decision (`claude`, `local`, or `blocked`) with `degraded.decision` field |
| `engine.sh context --skill <name>` | L0–L4 ICM context for the named skill |

**Properties:**
- All three are read-only — they never write or modify state.
- `engine.sh context` lives in `src/commands/context/`.
- The OKF round-trip (`engine.sh okf export|import`) is a separate surface for interoperability.

**Consequences:**
- The ingest-agent reads `engine.sh config --json` to determine `effective = min(maxParallelExtract, 8, len(pending))`.
- The ingest-agent reads `engine.sh route --json` to decide whether to degrade to sequential extraction.
- Skills that need their own context can self-describe via `engine.sh context --skill <name>`.

## Related

The `engine.sh backlog --json` surface (used in Step 1.1 of the ingest pipeline) is a related read-only surface for source enumeration. ADR-0026 uses `config --json` and `route --json` in the parallel-extract fan-out logic.
