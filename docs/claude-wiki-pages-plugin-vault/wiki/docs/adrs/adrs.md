---
title: "ADRs"
type: index
aliases: ["adrs", "ADRs", "Architecture Decision Records", "architecture-decision-records"]
parent: "[[docs|Docs]]"
path: "docs/adrs"
children:
  - "[[adr-0001-four-layer-orchestrator|ADR-0001: Four-Layer Orchestrator]]"
  - "[[adr-0002-agent-naming-convention|ADR-0002: Agent Naming Convention]]"
  - "[[adr-0003-polish-agent|ADR-0003: Polish Agent and Obsidian Side]]"
  - "[[adr-0004-ontology-profile-v1|ADR-0004: Ontology Profile v1]]"
  - "[[adr-0005-git-required|ADR-0005: Git Required Per Vault Init]]"
  - "[[adr-0006-search-score-object|ADR-0006: Search Score Object]]"
  - "[[adr-0007-wiki-native-recall|ADR-0007: Wiki-Native Recall]]"
  - "[[adr-0008-graph-traversal|ADR-0008: Graph Traversal Primitive]]"
  - "[[adr-0009-multi-vault-confinement|ADR-0009: Multi-Vault Confinement]]"
  - "[[adr-0010-durable-memory|ADR-0010: Durable Memory Carve-Out]]"
  - "[[adr-0011-local-model-quality-gate|ADR-0011: Local-Model Quality Gate]]"
  - "[[adr-0012-vault-merge-conflict|ADR-0012: Vault Merge Conflict Resolution]]"
  - "[[adr-0013-design-drift-gate|ADR-0013: Design Drift Gate]]"
  - "[[adr-0014-single-source-required-fields|ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning]]"
  - "[[adr-0015-engine-self-description|ADR-0015: Engine Self-Description Surfaces]]"
  - "[[adr-0016-multi-vault-management|ADR-0016: Simultaneous Multi-Vault Management]]"
  - "[[adr-0017-fabrication-floor|ADR-0017: Fabrication Floor and Verbatim Partition]]"
  - "[[adr-0018-offline-policy|ADR-0018: Offline Policy]]"
  - "[[adr-0019-query-tier|ADR-0019: Query Tier and Runtime Answer Verification]]"
  - "[[adr-0020-scaffolding-ablation|ADR-0020: Scaffolding Ablation Eval]]"
  - "[[adr-0022-folder-notes|ADR-0022: Folder Notes v3]]"
  - "[[adr-0023-wiki-only-graph|ADR-0023: Wiki-Only Graph]]"
  - "[[adr-0024-host-project-intake|ADR-0024: Host Project Intake]]"
  - "[[adr-0026-parallel-extract|ADR-0026: Parallel Extract]]"
  - "[[adr-0027-fill-gaps|ADR-0027: Fill-Gaps and Graph Quality]]"
  - "[[adr-0028-dangling-wikilink|ADR-0028: Dangling Wikilink Verify Check]]"
  - "[[adr-0029-drop-vault-example|ADR-0029: Drop Vault Example]]"
  - "[[adr-0030-obsidian-resolution|ADR-0030: Obsidian-Accurate Link Resolution and Collision]]"
  - "[[adr-0031-graph-connectivity|ADR-0031: Graph Connectivity, Orphans, and Shadows]]"
  - "[[adr-0032-piped-wikilinks|ADR-0032: Piped and Path-Qualified Wikilinks]]"
  - "[[adr-0033-topic-local-linking|ADR-0033: Topic-Local Linking]]"
  - "[[adr-0034-bun-required|ADR-0034: Bun Required]]"
  - "[[adr-0035-deterministic-obsidian|ADR-0035: Deterministic Obsidian]]"
  - "[[adr-0036-strict-tree|ADR-0036: Strict-Tree Topology]]"
  - "[[adr-conventions|ADR Conventions]]"
  - "[[adr-0027-acceptance-followups|ADR-0027 Acceptance Followups]]"
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
- [[adr-0002-agent-naming-convention|ADR-0002: Agent Naming Convention]] — `{plugin-name}-{role}-agent` convention that distinguishes agents from skills by name
- [[adr-0003-polish-agent|ADR-0003: Polish Agent and Obsidian Side]] — dedicated polish agent for graph colors, MOC regeneration, and folder note reconciliation
- [[adr-0005-git-required|ADR-0005: Git Required Per Vault Init]] — git as a non-negotiable vault dependency for reversible checkpoints
- [[adr-0034-bun-required|ADR-0034: Bun Required]] — why Bun >= 1.2 is a hard runtime requirement and how the degraded path behaves without it
- [[adr-0035-deterministic-obsidian|ADR-0035: Deterministic Obsidian]] — how the plugin generates `.obsidian/` config deterministically so vault opens are repeatable

## Schema and Ontology

- [[adr-0004-ontology-profile-v1|ADR-0004: Ontology Profile v1]] — the closed predicate domain→range table and enum list that formalizes the schema's relationships
- [[adr-0014-single-source-required-fields|ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning]] — CLAUDE.md table as the single required-fields truth; bash-only validator; duplicate-claim WARN
- [[adr-0022-folder-notes|ADR-0022: Folder Notes v3]] — the `wiki/<topic>/<topic>.md` folder-note convention replacing `_index.md`
- [[adr-0029-drop-vault-example|ADR-0029: Drop Vault Example]] — reference-vault as the golden test fixture; `skills/init/template/CLAUDE.md` as schema authority
- [[adr-conventions|ADR Conventions]] — append-only amendment rule, status lifecycle, and ADR structure conventions

## Retrieval and Recall

- [[adr-0006-search-score-object|ADR-0006: Search Score Object]] — the `matched{}` score object: page, terms, score, `next?` — the one retrieval contract
- [[adr-0007-wiki-native-recall|ADR-0007: Wiki-Native Recall]] — the NO-RAG stance with synonym lexicon, Porter stemmer, and pre-scoring expansion
- [[adr-0008-graph-traversal|ADR-0008: Graph Traversal Primitive]] — the one R2 `--graph` walk primitive: provenance/association core, N≤2 hops, no embeddings

## Operations and Pipeline

- [[adr-0010-durable-memory|ADR-0010: Durable Memory Carve-Out]] — agent session memory via `raw/agent-sessions/` as `source_type: agent-session`
- [[adr-0012-vault-merge-conflict|ADR-0012: Vault Merge Conflict Resolution]] — deterministic merge: higher `update_count` wins on frontmatter; body conflicts append for human review
- [[adr-0015-engine-self-description|ADR-0015: Engine Self-Description Surfaces]] — `config --json`, `route --json`, `context --skill` read-only engine surfaces
- [[adr-0016-multi-vault-management|ADR-0016: Simultaneous Multi-Vault Management]] — simultaneous N-vault management reusing existing provenance surfaces; read-only roll-up
- [[adr-0018-offline-policy|ADR-0018: Offline Policy]] — the fail-closed local-model routing policy with the per-tier allow-list
- [[adr-0024-host-project-intake|ADR-0024: Host Project Intake]] — `wire-source.sh add` for docs-only immutable snapshot of the host project
- [[adr-0026-parallel-extract|ADR-0026: Parallel Extract]] — the bounded parallel fan-out of extract workers and the single-writer invariant

## Local Models

- [[adr-0011-local-model-quality-gate|ADR-0011: Local-Model Quality Gate]] — golden-set eval for `ingest-extract` tier; exact structural comparison, no embeddings
- [[adr-0017-fabrication-floor|ADR-0017: Fabrication Floor and Verbatim Partition]] — invented claims floored at 0; over-citation reported as WARN
- [[adr-0019-query-tier|ADR-0019: Query Tier and Runtime Answer Verification]] — `query` tier + runtime verbatim-citation check before displaying to human
- [[adr-0020-scaffolding-ablation|ADR-0020: Scaffolding Ablation Eval]] — plugin arm 1.00/1.00/1.00 vs baseline 0.00/0.00/0.00 on schema_validity/claim_fidelity/dedup

## CI and Design Governance

- [[adr-0013-design-drift-gate|ADR-0013: Design Drift Gate]] — validate-docs.sh Check 5 (seven sub-checks: node grounding, link resolution, hook coverage, counts, authority, parity, ontology)
- [[adr-0009-multi-vault-confinement|ADR-0009: Multi-Vault Confinement]] — deny rule for cross-vault writes; malformed registry → fail-closed
- [[adr-0027-fill-gaps|ADR-0027: Fill-Gaps and Graph Quality]] — `/fill-gaps` command + `graph-quality.sh` detector (Cn, Ce, dangling, orphans)
- [[adr-0027-acceptance-followups|ADR-0027 Acceptance Followups]] — independently verified acceptance criteria for fill-gaps (157→0 lint findings, parity, Cn=Ce=1.0)

## Graph Topology and Wikilinks

- [[adr-0023-wiki-only-graph|ADR-0023: Wiki-Only Graph]] — two-layer exclusion: index exclusion for bookkeeping, graph-view exclusion for connective scaffolding
- [[adr-0028-dangling-wikilink|ADR-0028: Dangling Wikilink Verify Check]] — WARN-level dangling check; flat resolvable set; bash-TS parity
- [[adr-0030-obsidian-resolution|ADR-0030: Obsidian-Accurate Link Resolution and Collision]] — Obsidian priority (path > basename > alias); `wikilink-collision` WARN
- [[adr-0031-graph-connectivity|ADR-0031: Graph Connectivity, Orphans, and Shadows]] — orphan (no inbound), shadow (not MOC-reachable), Cn/Ce metrics
- [[adr-0032-piped-wikilinks|ADR-0032: Piped and Path-Qualified Wikilinks]] — `[[basename|Display]]` as normative form; path-qualify only on genuine 2+ collision
- [[adr-0033-topic-local-linking|ADR-0033: Topic-Local Linking]] — topic islands: restrict links to same-topic, ROOT hub, and `_sources/`
- [[adr-0036-strict-tree|ADR-0036: Strict-Tree Topology]] — only spine edges (`parent`/`children`/`child_indexes`) remain as graph edges; all other associations become tags
