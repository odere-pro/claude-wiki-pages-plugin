---
title: "ADR-0001: Four-Layer Orchestrator"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "orchestrator", "architecture"]
aliases: ["ADR-0001: Four-Layer Orchestrator"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0001: Four-Layer Orchestrator

## Summary

Establishes the single top-level `/claude-wiki-pages:wiki` command as the sole advertised entry point. The orchestrator probes vault state and dispatches to one specialist agent per invocation. Specialists must not re-probe state — they trust the orchestrator's payload.

## Key Claims

- One user-facing command: `/claude-wiki-pages:wiki`. All routing is internal.
- The orchestrator (`claude-wiki-pages-orchestrator-agent`) is the only top-level entry agent (`user-invocable: true`).
- Specialists (`ingest`, `curator`, `analyst`, `polish`) are never the primary entry; they accept the orchestrator's state payload.
- State probing (vault scan, log read) is the orchestrator's exclusive responsibility.
- The specialist pattern avoids redundant state probes and keeps each agent's contract small.

## Entities Mentioned

- [[Orchestrator Agent]]
- [[Ingest Agent]]
- [[Curator Agent]]
- [[Analyst Agent]]

## Concepts Covered

- [[Four-Layer Stack]]
- Specialist Pattern (orchestrator dispatches to one specialist agent per invocation; specialists never re-probe state)
- State Probing (vault scan + log read is the orchestrator's exclusive responsibility)

## Grounded Pages

Wiki pages that cite this source:

- [[Four-Layer Stack]] — four-layer rationale and routing model
- [[Orchestrator Agent]] — state-probing dispatch contract
- [[Ingest Pipeline]] — the specialist dispatch this ADR defines
- [[Auto-Heal]] — curator agent dispatch logic
- [[Entity Distribution Model]] — how agents distribute work
- [[Plugin Architecture Synthesis]] — cross-theme analysis
