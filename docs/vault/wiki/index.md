---
title: "Wiki Index"
type: index
parent: ""
path: ""
children:
  - "[[Architecture]]"
  - "[[Operations]]"
  - "[[Local Models]]"
child_indexes:
  - "[[Architecture]]"
  - "[[Operations]]"
  - "[[Local Models]]"
aliases: ["Wiki Index"]
tags: []
created: 2026-04-24
updated: 2026-06-11
---

# Wiki Index

Master catalog of every page in the wiki. Ingested from 9 raw sources on 2026-06-11.

## Topic Tree

- [[Architecture]] — Four-layer stack, agents, skills, hooks, provenance, agent teams (8 pages, last updated 2026-06-11)
- [[Operations]] — Installation, onboarding, day-to-day ops, automation, vault management, offline mode (9 pages, last updated 2026-06-11)
- [[Local Models]] — Capability tiers, quality gate, approved models, degraded mode routing (4 pages, last updated 2026-06-11)

## Architecture Pages

- [[Four-Layer Stack]] — Foundational structure: Data / Skills / Agents / Orchestration
- [[Layer 1 — Data]] — Immutable raw sources, typed wiki pages, vault schema; also covers Layer 2–4 (see `architecture/layers.md`)
- [[claude-wiki-pages]] — The plugin product entity
- [[claude-wiki-pages-orchestrator-agent]] — Top-level dispatch; also covers the other 6 agents (see `architecture/agents.md`)
- [[Provenance]] — Structural traceable chain from wiki pages to raw sources
- [[Hook-Enforced Safety]] — Lifecycle hooks enforcing schema on every write
- [[Ingest Data Flow]] — 11-step sequence for processing one raw source
- [[Agent Teams]] — Overview of the two dev-only teams; covers [[Brainstorming Team]] and [[Engineering Team]]

## Operations Pages

- [[Installation]] — Three install paths, prerequisites, Bun, verify and uninstall
- [[Onboarding]] — Guided first-run wizard and quickstart steps
- [[Doctor]] — Environment health check (D01–D10)
- [[One Advertised Path]] — `/claude-wiki-pages:wiki` as the single recommended entry; covers [[Orchestrator Routing]] and power-user bypasses
- [[Portable Markdown]] — Exporting wiki answers as portable markdown to `vault/output/`
- [[Automation]] — Three-layer opt-in vault automation system
- [[Backlog Detection]] — Deterministic pending-source detection; covers [[Heartbeat]] and [[Maintenance Loop]]
- [[Vault Location Resolution]] — Four-tier resolver; covers [[Multi-Vault Registry]] and [[Per-Vault Write Confinement]]
- [[Draft Review Gate]] — Single `_proposed/` channel; covers [[Offline Mode]] and [[Offline Draft]]

## Local Models Pages

- [[Capability Tier]] — Named levels of plugin functionality; covers [[Ingest-Extract]] and [[Query Tier]]
- [[Quality Gate]] — Eval metric and pass threshold; covers [[Golden Set]], [[Zero Fabrication Floor]], [[Answer Verification]]
- [[Approved Local Model]] — A model that cleared the quality gate; covers [[qwen3-coder:30b]]
- [[Degraded Mode Routing]] — Engine `route` decision; covers [[Reachability Probe]]

## Sources (wiki/_sources/)

Source summaries live in `wiki/_sources/`. Nine sources were ingested on 2026-06-11. Additional source pages not linked above: [[Features]], [[Getting Started]], [[Glossary]].

## Synthesis

- [[Fail-Closed by Design: Architecture and Local-Model Governance]] — Theme synthesis: how the fail-closed principle unifies the four-layer architecture with local-model quality-gate governance. Includes a gap analysis of pending raw sources.
