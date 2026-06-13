---
title: "Wiki Index"
type: index
parent: ""
path: ""
children: []
child_indexes:
  - "[[architecture]]"
  - "[[decisions]]"
  - "[[engine]]"
  - "[[guides]]"
  - "[[plugin]]"
  - "[[reference]]"
  - "[[wiki-pages]]"
aliases: ["Wiki Index"]
tags: []
created: 2026-06-13
updated: 2026-06-13

---

# Wiki Index

Master catalog of every page in this wiki. The wiki covers the `claude-wiki-pages` plugin: its architecture decisions, design patterns, agent and skill contracts, and operational guides.

## Topic Folders

- [[architecture]] — 14 pages, last updated 2026-06-13
- [[decisions]] — 7 pages, last updated 2026-06-13
- [[engine]] — 15 pages, last updated 2026-06-13
- [[guides]] — 9 pages, last updated 2026-06-13
- [[plugin]] — 5 pages, last updated 2026-06-13
- [[reference]] — 7 pages, last updated 2026-06-13
- [[wiki-pages]] — 3 pages, last updated 2026-06-13

## Special Collections

- [[Plugin Architecture Synthesis]] — three interlocking themes (determinism, provenance, fail-closed safety), 6 key findings, gaps, recommendations

## Architecture Pages

[[Four-Layer Stack]] · [[Deterministic Engine]] · [[Firewall]] · [[Hook System]] · [[Vault Resolution]] · [[Orchestrator Agent]] · [[Ingest Agent]] · [[Curator Agent]] · [[Analyst Agent]] · [[Polish Agent]] · [[Maintenance Agent]] · [[claude-wiki-pages Plugin]] · [[Design Diagrams]] · [[Git Checkpoint]]

## Engine Pages

[[engine.sh]] · [[cli.ts]] · [[Engine CLI Router]] · [[Engine Verb Surface]] · [[Search Scoring Algorithm]] · [[Tier-2 Deterministic Recall]] · [[Graph Walk Algorithm]] · [[Porter Stemmer]] · [[Synonym Lexicon]] · [[Provenance Checks]] · [[MOC Repair Primitives]] · [[Schema Version Gate]] · [[Draft Review Surface]] · [[Degraded-Mode Routing]] · [[Scripts Layer]]

## Decisions Pages

[[Architecture Decision Record]] · [[NO-RAG Principle]] · [[Ontology Profile v1]] · [[Wiki-Only Graph]] · [[Local Model Quality Gate]] · [[Wiki-Native Recall]] · [[Scaffolding Ablation]]

## Guides Pages

[[Onboarding Wizard]] · [[Ingest Pipeline]] · [[Entity Distribution Model]] · [[Lint Rules]] · [[Auto-Heal]] · [[Query Rules]] · [[Challenge Mode]] · [[Obsidian Experience]] · [[Folder Note]]

## Plugin Pages

[[Plugin Manifest]] · [[Agent Contract Table]] · [[Agent Tool Restriction]] · [[Single-Pass Dispatch]] · [[Plugin Dev-Time vs Runtime]]

## Reference Pages

[[Glossary Terms]] · [[Schema Authority]] · [[Multi-Vault Registry]] · [[Offline Policy]] · [[Approved Local Model]] · [[Backlog]] · [[Installation]]

## Wiki Pages Pages

[[Maintain Contract]] · [[Grounded Retrieval]] · [[Multi-Vault Operating Rules]]

## Source Summaries

One summary per ingested raw source. See individual source pages for full context.

### ADR Source Summaries

[[ADR-0001: Four-Layer Orchestrator]] · [[ADR-0002: Agent Naming Convention]] · [[ADR-0003: Polish Agent and Obsidian-Side Experience]] · [[ADR-0004: Ontology Profile v1]] · [[ADR-0005: Git Required Per-Vault Init]] · [[ADR-0006: One Search Score Object]] · [[ADR-0007: Wiki-Native Recall]] · [[ADR-0008: One Graph-Traversal Primitive]] · [[ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement]] · [[ADR-0010: Durable-Memory Carve-Out]] · [[ADR-0011: Local-Model Quality Gate]] · [[ADR-0012: Vault Merge Conflict Resolution]] · [[ADR-0013: Design-Drift Gate]] · [[ADR-0014: Single-Source Required Fields]] · [[ADR-0015: Engine Self-Description Surfaces]] · [[ADR-0016: Simultaneous Multi-Vault Management]] · [[ADR-0017: Fabrication Floor — Verbatim Partition]] · [[ADR-0018: Offline Policy and Degraded-Mode Routing]] · [[ADR-0019: Query Tier and Answer Verification]] · [[ADR-0020: The Scaffolding Ablation]] · [[ADR-0022: Folder Notes and Graph Quality]] · [[ADR-0023: Wiki-Only Graph]] · [[ADR Index]]

### Design Doc Source Summaries

[[Architecture Documentation]] · [[Automation]] · [[Design: System Context]] · [[Design: Component Design]] · [[Design: Sequences]] · [[Design: Teams and Agents]] · [[Design: Claude Config and Security]] · [[Design: Feature Relations]] · [[Design: Ontology]] · [[Design README]] · [[Design Diagram Template]]

### Reference Doc Source Summaries

[[Features]] · [[Getting Started (CLI Quickstart)]] · [[Glossary]] · [[Installation Guide]] · [[Local Models]] · [[Operations Guide]] · [[Agent Teams]]

### Engine Source Summaries

[[Engine Scripts Layer (CLAUDE.md)]] · [[Engine API Skill (SKILL.md)]] · [[engine.sh Source]] · [[cli.ts Source]] · [[firewall.ts Source]] · [[verify.ts Source]] · [[route.ts Source]] · [[schema.ts Source]] · [[search.ts Source]] · [[graph.ts Source]] · [[snapshot.ts Source]] · [[provenance.ts Source]] · [[moc-build.ts Source]] · [[stem.ts Source]] · [[vocabulary.ts Source]] · [[propose.ts Source]]

### User Guide Source Summaries

[[User Guide 01: Getting Started]] · [[User Guide 02: Create a New Vault]] · [[User Guide 03: Update Existing Vault]] · [[User Guide 04: Review Validate Fix]] · [[User Guide 05: Export Outputs]] · [[User Guide 06: Check the Dashboard]] · [[User Guide 07: Query the Wiki]] · [[User Guide: Index]] · [[User Guide: Obsidian Experience]]

### Plugin Source Summaries

[[Plugin README]] · [[Plugin CLAUDE.md]] · [[Plugin Manifest (plugin.json)]] · [[Orchestrator Agent Source]] · [[Ingest Agent Source]] · [[Curator Agent Source]] · [[Analyst Agent Source]] · [[Onboarding Agent Source]] · [[Maintenance Agent Source]] · [[Polish Agent Source]]

### Skills Source Summaries

[[Wiki Pages Skill (maintain-contract SKILL.md)]]
