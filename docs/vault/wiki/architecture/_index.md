---
title: "Architecture"
type: index
aliases: ["Architecture", "architecture", "four-layer stack", "Four-Layer Stack"]
parent: "[[Wiki Index]]"
path: "architecture"
children:
  - "[[Four-Layer Stack]]"
  - "[[Layer 1 — Data]]"
  - "[[claude-wiki-pages]]"
  - "[[claude-wiki-pages-orchestrator-agent]]"
  - "[[Provenance]]"
  - "[[Hook-Enforced Safety]]"
  - "[[Ingest Data Flow]]"
  - "[[Agent Teams]]"
child_indexes: []
tags: [architecture]
created: 2026-06-11
updated: 2026-06-11
---

# Architecture

Navigation index for the `claude-wiki-pages` architecture topic. Covers the four-layer stack, all seven agents, skills, hooks, orchestration, provenance, and the two dev-only agent teams.

## Core Architecture

- [[Four-Layer Stack]] — The foundational four-layer structure (Data / Skills / Agents / Orchestration)
- [[Layer 1 — Data]] — Immutable raw sources, typed wiki pages, vault schema
- [[Layer 2 — Skills]] — 23 single-responsibility capabilities
- [[Layer 3 — Agents]] — 7 multi-step executors
- [[Layer 4 — Orchestration]] — Hooks, scripts, rules, slash commands

## Agents

- [[claude-wiki-pages-orchestrator-agent]] — Top-level dispatch; probes vault state
- [[claude-wiki-pages-ingest-agent]] — Full ingest-then-verify-then-curate-then-synthesize cycle
- [[claude-wiki-pages-curator-agent]] — Audits and auto-repairs wiki structure
- [[claude-wiki-pages-analyst-agent]] — Five-mode analytical executor
- [[claude-wiki-pages-polish-agent]] — Tail-of-write Obsidian sync step
- [[claude-wiki-pages-maintenance-agent]] — Autonomous catch-up loop
- [[claude-wiki-pages-onboarding-agent]] — Guided first-run scaffold

## Plugin Entity

- [[claude-wiki-pages]] — The plugin identifier and top-level product

## Quality and Safety

- [[Provenance]] — Structural traceable chain from wiki pages to raw sources
- [[Hook-Enforced Safety]] — Lifecycle hooks that enforce the schema on every write
- [[Ingest Data Flow]] — The 11-step sequence for processing one raw source

## Development Teams

- [[Agent Teams]] — Overview of the two dev-only teams
- [[Brainstorming Team]] — UX and adoption ideation panel (11 personas)
- [[Engineering Team]] — Implementation team (9 roles, four lanes)
