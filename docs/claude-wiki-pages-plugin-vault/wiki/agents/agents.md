---
title: "Agents"
type: index
aliases: ["agents", "Agents", "LLM Wiki Agents", "specialist agents"]
parent: "[[index|Wiki Index]]"
path: "agents"
children:
  - "[[orchestrator-agent|Orchestrator Agent]]"
  - "[[ingest-agent|Ingest Agent]]"
  - "[[curator-agent|Curator Agent]]"
  - "[[analyst-agent|Analyst Agent]]"
  - "[[extract-worker-agent|Extract Worker Agent]]"
  - "[[maintenance-agent|Maintenance Agent]]"
  - "[[onboarding-agent|Onboarding Agent]]"
  - "[[polish-agent|Polish Agent]]"
  - "[[specialist-dispatch-pattern|Specialist Dispatch Pattern]]"
child_indexes: []
tags: ["agents"]
created: 2026-06-25
updated: 2026-06-25
---

# Agents

Layer 3 of the claude-wiki-pages four-layer stack: eight multi-step executors that implement the plugin's behaviors.

## Pages

### Write-path specialists

- [[orchestrator-agent|Orchestrator Agent]] — top-level router; probes vault state and dispatches one specialist per invocation
- [[ingest-agent|Ingest Agent]] — four-step pipeline: read raw sources → write wiki pages → auto-heal → synthesize
- [[curator-agent|Curator Agent]] — structural lint and automatic repair under a git checkpoint
- [[polish-agent|Polish Agent]] — tail-of-write finisher: graph colors, index refresh, MOC consistency
- [[maintenance-agent|Maintenance Agent]] — autonomous catch-up loop (ingest → curator → polish → lint); off by default

### Read-only and first-run specialists

- [[analyst-agent|Analyst Agent]] — five-mode query/dashboard/compile/extract/challenge agent
- [[extract-worker-agent|Extract Worker Agent]] — read-only sub-agent returning a typed EXTRACT envelope per source
- [[onboarding-agent|Onboarding Agent]] — guided first-run executor (probe → scaffold → source → ingest → answer)

### Architecture concepts

- [[specialist-dispatch-pattern|Specialist Dispatch Pattern]] — the one-specialist-per-invocation rule that governs all agent routing

## Subtopics

