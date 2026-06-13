---
title: "Orchestrator Agent"
type: entity
entity_type: tool
aliases: ["Orchestrator Agent", "orchestrator agent", "claude-wiki-pages-orchestrator-agent", "orchestrator"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[ADR-0001: Four-Layer Orchestrator]]", "[[ADR-0002: Agent Naming Convention]]", "[[Operations Guide]]"]
related: ["[[Ingest Agent]]", "[[Curator Agent]]", "[[Analyst Agent]]", "[[Polish Agent]]", "[[Maintenance Agent]]", "[[Four-Layer Stack]]"]
tags: ["agent", "orchestrator"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Orchestrator Agent

## Overview

The `claude-wiki-pages-orchestrator-agent` is the top-level entry agent for `/claude-wiki-pages:wiki`. It is the sole user-invocable agent (`user-invocable: true`). The orchestrator probes vault state once and dispatches to exactly one specialist agent per invocation. Specialists must never re-probe state — they trust the orchestrator's payload (ADR-0001).

## Key Facts

- **Slug:** `claude-wiki-pages-orchestrator-agent`
- **Entry command:** `/claude-wiki-pages:wiki`
- **Routing table:**

| State found | What runs |
| --- | --- |
| No vault or no `schema_version` | Onboarding wizard (scaffold + orient) |
| Files in `raw/` not in `wiki/log.md` | Ingest pipeline |
| Previous ingest not followed by lint | Curator (audit-and-repair) |
| Analytical prompt (`what`, `why`, `compare`) | Analyst |
| Pending drafts in `_proposed/` | Review gate |
| `maintenance.enabled` + backlog | Maintenance agent |

- **Polish runs as tail step** after every successful ingest or curator pass.

## Related

- [[Ingest Agent]] — dispatched when pending sources exist
- [[Curator Agent]] — dispatched for audit-and-repair
- [[Analyst Agent]] — dispatched for analytical queries
- [[Polish Agent]] — tail-of-write step after ingest or curator
- [[Maintenance Agent]] — dispatched for autonomous backlog catch-up
- [[Specialist Pattern]] — specialists never re-probe state
