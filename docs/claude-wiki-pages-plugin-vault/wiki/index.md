---
schema_version: 2
title: Wiki Index
type: index
parent: ""
path: ""
children:
  - "[[Four-Layer Stack]]"
  - "[[Agent Roles]]"
  - "[[Skill Catalog]]"
  - "[[ADRs]]"
  - "[[Operations Guide]]"
  - "[[Local Model Quality Gate]]"
  - "[[Automation Guide]]"
  - "[[Feature Overview]]"
  - "[[Canonical Terms]]"
  - "[[System Context]]"
  - "[[Plugin Overview — claude-wiki-pages]]"
child_indexes:
  - "[[architecture/architecture]]"
  - "[[agents/agents]]"
  - "[[skills/skills]]"
  - "[[adrs/adrs]]"
  - "[[operations/operations]]"
  - "[[local-models/local-models]]"
  - "[[automation/automation]]"
  - "[[features/features]]"
  - "[[glossary/glossary]]"
  - "[[design/design]]"
aliases: ["Wiki Index", "MOC", "Map of Contents"]
tags: [index, moc]
created: 2026-04-24
updated: 2026-06-12
---

# Wiki Index

| Cluster | Pages | Index |
|---------|-------|-------|
| Architecture | 6 | [[Architecture]] |
| Agents | 8 | [[Agents]] |
| Skills | 4 | [[Skills]] |
| ADRs | 20 | [[ADRs]] |
| Operations | 6 | [[Operations]] |
| Local Models | 4 | [[Local Models]] |
| Automation | 1 | [[Automation]] |
| Features | 2 | [[Features]] |
| Glossary | 1 | [[Glossary]] |
| Design | 6 | [[Design]] |

`claude-wiki-pages` plugin documentation wiki. Schema authority: `CLAUDE.md`. Last ingest: 2026-06-12 (39 sources → 58 pages).

## Clusters

### Architecture (6 pages)
- [[Four-Layer Stack]] — the four-layer design and why each layer exists
- [[Data Layer]] — Layer 1: raw sources, wiki pages, CLAUDE.md schema
- [[Skills Layer]] — Layer 2: 24 single-responsibility skills
- [[Agents Layer]] — Layer 3: 7 multi-step executors
- [[Orchestration Layer]] — Layer 4: hooks, scripts, rules, commands, firewall, engine
- [[Data Flow]] — 13-step ingest flow through all four layers

### Agents (8 pages)
- [[Agent Roles]] — all 7 agents: dispatch table, naming convention
- [[Orchestrator Agent]] — top-level entry; state-probing dispatch
- [[Ingest Agent]] — full ingest pipeline executor
- [[Curator Agent]] — structural audit + auto-repair
- [[Analyst Agent]] — Query, Dashboard, Document Compile, Extract, Challenge modes
- [[Polish Agent]] — Obsidian-side sync after write
- [[Maintenance Agent]] — autonomous catch-up loop
- [[Onboarding Agent]] — guided first-run wizard

### Skills (4 pages)
- [[Skill Catalog]] — full list of all 24 skills
- [[Action Skills]] — the 13 plugin-authored action verbs
- [[Agent Teaching Skills]] — 5 skills that teach agents shared mechanisms
- [[Obsidian Skills]] — Obsidian-specific skills (plugin-authored + third-party)

### ADRs (20 pages)
- [[ADR-0001 Four-Layer Orchestrator]] — single top-level command + dispatch
- [[ADR-0002 Agent Naming Convention]] — `{plugin-name}-{role}-agent`
- [[ADR-0003 Polish Agent]] — Obsidian-side experience centralized
- [[ADR-0004 Ontology Profile v1]] — one predicate table; one enum list
- [[ADR-0005 Git Required Per Vault Init]] — git-required per-vault init
- [[ADR-0006 Search Score Object]] — one score object: `score + matched[]`
- [[ADR-0007 Wiki-Native Recall]] — embedding-free query expansion
- [[ADR-0008 Graph Traversal Primitive]] — one `walk()` primitive in `src/core/graph.ts`
- [[ADR-0009 Multi-Vault Confinement]] — registry + cross-vault deny
- [[ADR-0010 Durable Memory Carve-Out]] — `raw/agent-sessions/` + `_proposed/` gate
- [[ADR-0011 Local Model Quality Gate]] — per-tier golden-set eval, fail-closed
- [[ADR-0012 Vault Merge Conflict Resolution]] — design accepted; implementation deferred
- [[ADR-0013 Design Drift Gate]] — `validate-docs.sh` Check 5
- [[ADR-0014 Single Source Required Fields]] — required fields from schema; duplicate-claim WARN
- [[ADR-0015 Engine Self-Description]] — `capabilities`/`ontology --json`
- [[ADR-0016 Simultaneous Multi-Vault Management]] — fail-closed registry; read-time audit roll-up
- [[ADR-0017 Fabrication Floor]] — verbatim partition; zero-invention floor
- [[ADR-0018 Offline Policy and Degraded Mode]] — three routing policies
- [[ADR-0019 Query Tier and Answer Verification]] — runtime back-check before answer
- [[ADR-0020 Scaffolding Ablation Eval]] — measured proof of plugin value

### Operations (6 pages)
- [[Operations Guide]] — one-verb model and day-to-day commands
- [[Vault Resolution]] — four-tier resolution order
- [[Hook System]] — 5 event types, firing order, session memory
- [[Multi-Vault Registry]] — registry shape, lifecycle, cross-vault rule
- [[Draft Review Gate]] — `_proposed/` staging and promote/reject flow
- [[Offline and Degraded Mode]] — routing policies, local model operation

### Local Models (4 pages)
- [[Local Model Quality Gate]] — eval design, golden set, zero-fabrication floor
- [[Approved Local Models]] — approved table + tested-and-rejected table
- [[Offline Policy]] — Layer 4 scripts, reachability, session advisory
- [[Capability Tiers]] — tier status table and progression model

### Automation (1 page)
- [[Automation Guide]] — three layers (backlog detection, heartbeat, maintenance loop)

### Features (2 pages)
- [[Feature Overview]] — schema, hook-enforced safety, DX, 5-tier test harness, comparison
- [[Scaffolding Ablation]] — measured value: ablation metrics, mechanism table

### Glossary (1 page)
- [[Canonical Terms]] — schema terms, architecture terms, retrieval terms, banned strings

### Design (6 pages)
- [[System Context]] — L0/L1 context and layer diagrams
- [[Component Design]] — L2 component breakdown, hook→script mapping
- [[Sequence Diagrams]] — session start + ingest write-path step-by-step flows
- [[Teams and Agents]] — dev teams (brainstorm + engineering) and runtime agents
- [[Security and Configuration]] — vault resolution, write boundary, firewall chain
- [[Feature Relations]] — how Claude Code building blocks connect in this repo

### Synthesis
- [[Plugin Overview — claude-wiki-pages]] — cross-cutting synthesis: what the plugin is, how it works, the measured value

---
_58 pages across 10 clusters | Sources: 39 | Ingest: 2026-06-12_
