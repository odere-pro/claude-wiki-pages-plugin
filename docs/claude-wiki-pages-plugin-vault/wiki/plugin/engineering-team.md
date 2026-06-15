---
title: "Engineering Team"
type: entity
entity_type: organization
aliases: ["Engineering Team", "engineering team", "wiki-dev", "wiki-dev team"]
parent: "[[plugin|claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[design-04-teams-and-agents|Design: Teams and Agents]]", "[[_sources/teams|Agent Teams]]"]
related: ["[[brainstorming-team|Brainstorming Team]]", "[[four-layer-stack|Four-Layer Stack]]"]
tags: ["entity", "organization", "dev-team"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Engineering Team

## Overview

The engineering team (`wiki-dev`) is a dev-only Claude Code agent team stored in `.claude/teams/wiki-dev/`. It consists of 9 roles across 4 specialization lanes and implements the proposals ratified from the [[brainstorming-team|Brainstorming Team]]. Like the brainstorming team, it is a development tool for driving the plugin's own design — not a runtime plugin component.

## Key Facts

**Composition (9 roles across 4 lanes):**

| Lane | Focus                       | Roles                         |
| ---- | --------------------------- | ----------------------------- |
| A    | Retrieval/Engine            | Senior Engineer A             |
| B    | Schema/Ontology/Multi-vault | Senior Engineer B             |
| C    | Ingest/Context/Memory       | Senior Engineer C             |
| D    | Portability/UX/DX           | Senior Engineer D             |
| —    | Management                  | Manager, PM, Architect        |
| —    | Quality                     | QA-functional, QA-adversarial |

**Flow:** PM spec → Architect verdict → TDD (each engineer) → QA-functional → QA-adversarial → PM acceptance → Delivery Lead integrates.

**Non-negotiables:** Same as the brainstorming team — NO RAG, structural provenance, DRY, ontology-in-schema, structured authoring, glossary-first, KISS/YAGNI.

**Output:** Shipped ADRs and gate-green changes. Unlike the brainstorming team (which produces transient proposals), the engineering team's output is committed, tested, and merged.

**Handoff from brainstorming team:** The [[brainstorming-team|Brainstorming Team]] produces phased roadmap proposals. The Architect on the engineering team ratifies proposals as ADRs. Engineers implement under the ratified ADR. QA-functional tests correctness; QA-adversarial tests security, adversarial inputs, and edge cases. PM accepts the deliverable. Delivery Lead integrates.

## Relationship to Runtime Agents

The engineering team is the team that builds and maintains the plugin's 7 runtime agents (orchestrator, onboarding, ingest, curator, analyst, polish, maintenance). It is not one of those agents — it is the development organization that creates them.

## Related

- [[brainstorming-team|Brainstorming Team]] — the ideation team whose proposals the engineering team implements
- [[four-layer-stack|Four-Layer Stack]] — the architecture the engineering team maintains
- Architecture Decision Record — the ADR format that governs the engineering team's design decisions
