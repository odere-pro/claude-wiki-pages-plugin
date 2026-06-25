---
title: "ADRs"
type: index
aliases: ["adrs", "ADRs", "Architecture Decision Records", "architecture-decision-records"]
parent: "[[docs|Docs]]"
path: "docs/adrs"
children:
  - "[[adr-0001-four-layer-orchestrator|ADR-0001: Four-Layer Orchestrator]]"
  - "[[adr-0004-ontology-profile-v1|ADR-0004: Ontology Profile v1]]"
  - "[[adr-0007-wiki-native-recall|ADR-0007: Wiki-Native Recall]]"
  - "[[adr-0018-offline-policy|ADR-0018: Offline Policy]]"
  - "[[adr-0022-folder-notes|ADR-0022: Folder Notes v3]]"
  - "[[adr-0026-parallel-extract|ADR-0026: Parallel Extract]]"
  - "[[adr-0033-topic-local-linking|ADR-0033: Topic-Local Linking]]"
  - "[[adr-0034-bun-required|ADR-0034: Bun Required]]"
  - "[[adr-0035-deterministic-obsidian|ADR-0035: Deterministic Obsidian]]"
  - "[[adr-0036-strict-tree|ADR-0036: Strict-Tree Topology]]"
child_indexes: []
tags: ["docs", "adrs"]
created: 2026-06-25
updated: 2026-06-25
---

# ADRs

Architecture Decision Records for the claude-wiki-pages plugin — the immutable log of key design choices, their drivers, and their trade-offs.

## Overview

Each ADR records one decision with a status (Proposed / Accepted / Superseded / Deprecated), drivers, considered options, the chosen option, its consequences, and a test/verification plan. ADRs are append-only; a new ADR supersedes an old one rather than editing it.

The 10 ADRs ingested here span the plugin's foundational decisions: its four-layer architecture, its ontology contract, its NO-RAG retrieval stance, its offline policy, its folder-note convention, its parallel extraction model, its topic-island graph shape, its Bun runtime requirement, its Obsidian determinism guarantee, and its strict-tree topology rule.

## Architecture and Stack

- [[adr-0001-four-layer-orchestrator|ADR-0001: Four-Layer Orchestrator]] — Data / Skills / Agents / Orchestration layers and the orchestrator-first entry contract
- [[adr-0034-bun-required|ADR-0034: Bun Required]] — why Bun >= 1.2 is a hard runtime requirement and how the degraded path behaves without it
- [[adr-0035-deterministic-obsidian|ADR-0035: Deterministic Obsidian]] — how the plugin generates `.obsidian/` config deterministically so vault opens are repeatable

## Schema and Ontology

- [[adr-0004-ontology-profile-v1|ADR-0004: Ontology Profile v1]] — the closed predicate domain→range table and enum list that formalizes the schema's relationships
- [[adr-0022-folder-notes|ADR-0022: Folder Notes v3]] — the `wiki/<topic>/<topic>.md` folder-note convention replacing `_index.md`

## Retrieval and Recall

- [[adr-0007-wiki-native-recall|ADR-0007: Wiki-Native Recall]] — the NO-RAG stance with synonym lexicon, Porter stemmer, and pre-scoring expansion

## Operations and Pipeline

- [[adr-0018-offline-policy|ADR-0018: Offline Policy]] — the fail-closed local-model routing policy with the per-tier allow-list
- [[adr-0026-parallel-extract|ADR-0026: Parallel Extract]] — the bounded parallel fan-out of extract workers and the single-writer invariant

## Graph Topology

- [[adr-0033-topic-local-linking|ADR-0033: Topic-Local Linking]] — topic islands: restrict links to same-topic, ROOT hub, and `_sources/`
- [[adr-0036-strict-tree|ADR-0036: Strict-Tree Topology]] — only spine edges (`parent`/`children`/`child_indexes`) remain as graph edges; all other associations become tags
