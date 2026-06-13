---
title: "Agent Teams"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["reference", "teams", "agents"]
aliases: ["Agent Teams"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Agent Teams

## Summary

Two dev-only agent teams: brainstorming (11 personas, ideation) and engineering (`wiki-dev`, 9 roles, implementation). Neither ships in the plugin. Both are read-only on the plugin until work is explicitly assigned.

## Key Claims

- Brainstorming team: `.claude/teams/wiki-brainstorm/` — 11 personas (PM, Architect, Structure-Authoring Architect, Ontology Engineer, Senior Engineer, Plugin Expert, Plugin Power User, New Claude User, Claude Code Config Expert, Grill-Me Interrogator, Skeptic). Three-round protocol: Divergence → Cross-critique → Convergence.
- Engineering team (`wiki-dev`): `.claude/teams/wiki-dev/` — 9 roles across 4 lanes (A: Retrieval/Engine, B: Schema/Ontology/Multi-vault, C: Ingest/Context/Memory, D: Portability/UX/DX). Flow: PM spec → Architect verdict → TDD → QA-functional → QA-adversarial → PM acceptance → Delivery Lead integrates.
- Handoff: brainstorming team produces roadmap proposal → Architect ratifies as ADRs → engineering team implements.
- Both share non-negotiables: NO RAG, structural provenance, DRY, ontology-in-schema, structured authoring, glossary-first, KISS/YAGNI.

## Entities Mentioned

- [[Orchestrator Agent]]

## Concepts Covered

- [[Brainstorming Team]]
- [[Engineering Team]]
- [[Four-Layer Stack]]
