---
title: "Docs"
type: index
aliases: ["docs", "Docs", "documentation", "plugin documentation"]
parent: "[[index|Wiki Index]]"
path: "docs"
children:
  - "[[four-layer-architecture|Four-Layer Architecture]]"
  - "[[canonical-glossary|Canonical Glossary]]"
  - "[[research-foundations|Research Foundations]]"
  - "[[operations-reference|Operations Reference]]"
  - "[[local-model-support|Local Model Support]]"
  - "[[getting-started-guide|Getting Started Guide]]"
  - "[[installation-guide|Installation Guide]]"
  - "[[features-overview|Features Overview]]"
  - "[[vault-automation|Vault Automation]]"
  - "[[agent-teams|Agent Teams]]"
  - "[[no-rag-stance|NO-RAG Stance]]"
  - "[[ontology-profile|Ontology Profile]]"
  - "[[strict-tree-topology|Strict Tree Topology]]"
  - "[[scaffolding-ablation|Scaffolding Ablation]]"
  - "[[user-guide-workflow|User Guide Workflow]]"
child_indexes:
  - "[[adrs|ADRs]]"
  - "[[design|Design]]"
  - "[[llm-wiki|LLM Wiki Guides]]"
tags: ["docs", "documentation"]
created: 2026-06-25
updated: 2026-06-25
---

# Docs

Official documentation for the claude-wiki-pages plugin: architecture, glossary, user guides, operations reference, local model support, automation, agent teams, and architecture decision records.

## Overview Docs

- [[four-layer-architecture|Four-Layer Architecture]] — the Data/Skills/Agents/Orchestration stack; each layer catches a different class of failure; data flow from raw source to verified wiki page
- [[canonical-glossary|Canonical Glossary]] — single-source canonical term list enforced by validate-docs.sh; two registers (technical and discoverability); banned strings; naming conventions

## Core Concepts

- [[no-rag-stance|NO-RAG Stance]] — embedding-free retrieval via synonym lexicon, Porter stemmer, and graph link-walk; CI-gated by gate-13
- [[ontology-profile|Ontology Profile]] — the ontology-profile-v1 block in CLAUDE.md; predicate domain→range table and closed enum list; single contract for R2, C1, and I1
- [[strict-tree-topology|Strict Tree Topology]] — only spine edges (parent/children/child_indexes) plus ROOT→folder-note connector among visible topic pages; tag de-cycling for associative relationships
- [[scaffolding-ablation|Scaffolding Ablation]] — measured comparison: plugin arm vs baseline arm; schema_validity/claim_source_fidelity/dedup_correctness 1.00 vs 0.00
- [[research-foundations|Research Foundations]] — academic prior art: Karpathy LLM Wiki pattern, NO-RAG, ICM, OKF, PROV, MOC, force-directed layout

## User Guides

- [[getting-started-guide|Getting Started Guide]] — eight-step quickstart from nothing to querying a populated wiki
- [[installation-guide|Installation Guide]] — three install paths (macOS one-command, remote marketplace, local); Bun requirement; doctor verification
- [[user-guide-workflow|User Guide Workflow]] — the seven-guide path: install, scaffold, ingest, validate, query, dashboard, outputs

## Operations

- [[operations-reference|Operations Reference]] — the one entry verb, orchestrator dispatch table, day-to-day verbs, vault resolution, multi-vault registry, hook event table
- [[vault-automation|Vault Automation]] — backlog detection, heartbeat, maintenance loop, scheduled upkeep via cron + maintenance-run.sh
- [[local-model-support|Local Model Support]] — capability tiers, approved models (qwen3-coder:30b), tested-and-rejected models, model qualification process
- [[features-overview|Features Overview]] — schema features, hook-enforced safety, DX, five-tier test harness, competitive comparison

## Developer

- [[agent-teams|Agent Teams]] — brainstorming team (wiki-brainstorm, 11 personas) and engineering team (wiki-dev, 9 teammates, four parallel lanes)

## Subtopics

- [[adrs|ADRs]] — architecture decision records (ADR-0001 through ADR-0036)
- [[design|Design]] — C4-style mermaid diagrams: sequences, teams/agents, config/security, feature relations, diagram conventions
- [[llm-wiki|LLM Wiki Guides]] — seven-guide path for operating a vault: scaffold, ingest, validate, query, dashboard, export, Obsidian
