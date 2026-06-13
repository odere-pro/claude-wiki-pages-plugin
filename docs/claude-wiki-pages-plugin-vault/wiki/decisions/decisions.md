---
title: "Decisions"
type: index
aliases: ["Decisions", "decisions", "ADRs", "Architecture Decision Records"]
parent: "[[Wiki Index]]"
path: "decisions"
children:
  - "[[Architecture Decision Record]]"
  - "[[NO-RAG Principle]]"
  - "[[Ontology Profile v1]]"
  - "[[Wiki-Only Graph]]"
  - "[[Local Model Quality Gate]]"
  - "[[Wiki-Native Recall]]"
  - "[[Scaffolding Ablation]]"
child_indexes: []
tags: ["decisions", "adr"]
created: 2026-06-13
updated: 2026-06-13
---

# Decisions

Map of Content for all Architecture Decision Records (ADRs).

## ADR Index

- [[Architecture Decision Record]] — the ADR format and governance rules

## Core Architecture Decisions

- [[ADR-0001: Four-Layer Orchestrator]] — single entry point, specialist dispatch
- [[ADR-0002: Agent Naming Convention]] — `{plugin-name}-{role}-agent` pattern
- [[ADR-0003: Polish Agent and Obsidian-Side]] — tail-of-write step ownership
- [[ADR-0004: Ontology Profile v1]] — single named ontology block in CLAUDE.md
- [[ADR-0005: Git Required Per-Vault]] — git init + two availability tiers

## Retrieval Decisions

- [[ADR-0006: One Search Score Object]] — `matched[]` breakdown, score invariant
- [[ADR-0007: Wiki-Native Recall]] — NO-RAG, synonym lexicon, Porter stemming
- [[ADR-0008: One Graph-Traversal Primitive]] — `walk()` BFS, N≤2, hop-decayed scores

## Vault and Security Decisions

- [[ADR-0009: Multi-Vault Registry]] — confinement, `cross-vault` deny, merge deferred
- [[ADR-0010: Durable Memory Carve-Out]] — `raw/agent-sessions/`, `_proposed/` gate
- [[ADR-0012: Vault Merge]] — design accepted, implementation deferred

## Quality and Validation Decisions

- [[ADR-0011: Local-Model Quality Gate]] — golden-set eval, zero-fabrication floor
- [[ADR-0013: Design-Drift Gate]] — `validate-docs.sh` Check 5
- [[ADR-0014: Single-Source Required Fields]] — machine-readable table in CLAUDE.md
- [[ADR-0015: Engine Self-Description]] — `CAPABILITIES` table, `--json` endpoints
- [[ADR-0016: Multi-Vault Registry Fail-Closed]] — OQ-9 fix, audit roll-up
- [[ADR-0017: Fabrication Floor]] — verbatim partition, over-citation vs fabrication
- [[ADR-0020: Scaffolding Ablation]] — measured plugin arm vs baseline arm

## Offline and Local Model Decisions

- [[ADR-0018: Offline Policy]] — `offlinePolicy`, `reachability.sh`, `engine route`
- [[ADR-0019: Query Tier]] — local query with runtime answer verification

## Graph and Schema Decisions

- [[ADR-0022: Folder Notes and Graph Quality]] — schema v3, wikilink hierarchy fields
- [[ADR-0023: Wiki-Only Graph]] — exclude raw/templates, graph config as cache
