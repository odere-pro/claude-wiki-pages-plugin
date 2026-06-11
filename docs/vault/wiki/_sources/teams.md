---
title: "Agent Teams"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [teams, agents, development, brainstorming, engineering]
aliases: ["Agent Teams"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Agent Teams

## Summary

Documents two dev-only agent teams that plan and build the plugin: the brainstorming team (11 personas, UX and adoption ideation, proposal-only, `.claude/teams/wiki-brainstorm/`) and the engineering team — `wiki-dev` (9 teammates, implements decisions as shipped gate-green changes, `.claude/teams/wiki-dev/`). Neither team ships in the plugin or is loaded as end-user session context.

## Key Claims

- Brainstorming team: 11 personas, three-round protocol (Diverge → Cross-critique → Converge), Product Manager holds facilitator/synthesizer hat.
- Roles include product-manager, architect, structure-authoring-architect, ontology-engineer, senior-engineer, plugin-expert, plugin-power-user, new-claude-user, claude-code-config-expert, grill-me-interrogator, skeptic.
- grill-me-interrogator requires an external grill-me skill not in this repo.
- Engineering team (`wiki-dev`): 9 roles — manager, PM, architect, 4 engineers (lanes A/B/C/D), functional QA, adversarial QA.
- Four parallel lanes: A (Retrieval & Engine), B (Schema, Ontology & Multi-vault), C (Ingest, Context & Memory), D (Portability, UX/DX & Docs).
- Phase order: Phase 0 → Phase 1 + Phase U (interleaved) → Phase 2 → Phase 3.
- Handoff from brainstorming to engineering: proposal → Architect ratifies decisions as ADRs → engineering implements.
- Both teams share non-negotiables: NO RAG, structural provenance, DRY, ontology-in-schema, glossary-first, KISS/YAGNI.

## Entities Mentioned

- [[wiki-dev-manager]]
- [[wiki-dev-pm]]
- [[wiki-dev-architect]]
- [[wiki-dev-eng-retrieval]]
- [[wiki-dev-eng-schema]]
- [[wiki-dev-eng-ingest]]
- [[wiki-dev-eng-ux]]
- [[wiki-dev-qa-functional]]
- [[wiki-dev-qa-adversarial]]

## Concepts Covered

- [[Brainstorming Team]]
- [[Engineering Team]]
- [[Agent Teams]]
- [[ADR]]
