---
title: "ADR-0002: Agent Naming Convention"
type: entity
entity_type: standard
aliases: ["ADR-0002", "adr-0002", "agent naming convention ADR"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0002|ADR-0002: Agent Naming Convention]]"]
related: []
tags: ["docs", "adrs", "architecture", "agents"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0002: Agent Naming Convention

Establishes the canonical naming convention for all Layer 3 and Layer 4 agents: `{plugin-name}-{role}-agent`.

## Overview

ADR-0002 resolves a flat-namespace collision between skills and agents, and a naming inconsistency introduced when the orchestrator joined the directory. The convention makes it unambiguous by name alone whether a given file is a skill (short verb) or an agent (compound `{plugin}-{role}-agent`).

## Key Facts

**Status:** Accepted

**Drivers:**
- No way to tell a skill from an agent by name alone (`llm-wiki-ingest` is a skill; `llm-wiki-ingest-pipeline` was an agent — confusing).
- The orchestrator added a second convention into the same flat directory.
- The vocabulary gate (`validate-docs.sh`) enforces prose term consistency but had no matching convention for file names.

**Decision:** All Layer 3 / Layer 4 agents use `{plugin-name}-{role}-agent`. Skills keep their short verb names.

**Examples:**
- `claude-wiki-pages-orchestrator-agent` — the top-level dispatcher
- `claude-wiki-pages-ingest-agent` — the ingest pipeline executor
- `claude-wiki-pages-curator-agent` — the lint-and-fix executor

**Note:** The plugin id was renamed from `llm-wiki-stack` to `claude-wiki-pages` after this ADR. Worked examples in the ADR source retain the retired id.

**Consequences:**
- A slash command like `/claude-wiki-pages:wiki` always maps to the orchestrator.
- Agent files are immediately distinguishable from skill files in `agents/` vs `skills/`.
- The vocabulary gate can enforce the convention in prose references.

## Related

The naming convention is enforced by the vocabulary gate (`validate-docs.sh`). The eight shipped agents that follow this convention are documented in the four-layer architecture.
