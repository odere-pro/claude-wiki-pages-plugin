---
title: "ADR-0001: Four-Layer Orchestrator"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-02
date_ingested: 2026-06-25
tags: ["docs", "adr", "architecture"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0001: Four-Layer Orchestrator

## Metadata

- File: `raw/repo/docs/adr/ADR-0001-four-layer-orchestrator.md`
- Status: Accepted (superseded-with-conditions by ADR-0026 for ingest map-phase only)

## Summary

Adopts a single top-level orchestrator that mirrors the four-layer dispatch pattern: one slash command (/wiki), one orchestrator agent, specialist agents fanned out from the orchestrator, skills consumed by specialists. Solves drop-out after init and manual chain fragility.

## Key Claims

Decision: /claude-wiki-pages:wiki → orchestrator agent → one specialist per invocation (init wizard, ingest, curator, or analyst). Orchestrator owns vault state probing and dispatch; specialists must not re-probe state. Dispatch rules: no vault → init wizard; raw/ has unlogged files → ingest; lint drift → curator; analytical prompt → analyst; ambiguous → ask one clarifying question, never fan out. ADR-0026 narrows the ingest specialist's internal map-phase only; the one-Task-per-invocation orchestrator contract is unchanged. Alternatives rejected: add orchestrator without slash command (rejected — not discoverable), flat namespace + documentation (rejected — documentation not read), omnibus agent (rejected — not testable), mode-toggle plugin (rejected — exports routing to user), chaining inside skills (rejected — breaks testability boundary).

Covers: Orchestrator Dispatch, Four-Layer Stack, State Probing, Single Entry Verb
