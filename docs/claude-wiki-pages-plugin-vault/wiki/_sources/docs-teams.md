---
title: "Agent Teams"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "teams"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Agent Teams

## Metadata

- File: `raw/repo/docs/teams.md`
- Type: developer documentation

## Summary

Describes the two dev-only agent teams under .claude/teams/ that plan and build the plugin itself. Neither ships in the plugin runtime context. Brainstorming team ideates on UX/adoption; engineering team (wiki-dev) implements gate-green changes.

## Key Claims

Two dev-only teams, neither in plugin runtime: (1) Brainstorming team (wiki-brainstorm) — 11 personas, UX & adoption, three-round protocol (Divergence → Cross-critique → Convergence), Product Manager + Architect lead; read-only on the plugin; (2) Engineering team (wiki-dev) — 9 teammates, implements four-layer roadmap across four parallel lanes (A: Retrieval & Engine, B: Schema & Ontology, C: Ingest & Memory, D: Portability & UX/DX). Engineering team handoff chain: PM acceptance → Architect design → engineer TDD → QA-functional (Tier 0+1, 80% coverage) → QA-adversarial (Tier 2-4) → PM acceptance → Delivery Lead. Both teams share non-negotiables: NO RAG, structural provenance, DRY, ontology-in-schema, structured authoring, glossary-first, KISS/YAGNI. External dependency: grill-me skill (not in this repo).

Covers: Brainstorming Team, Engineering Team, wiki-dev, Four Lanes, Agent Teams
