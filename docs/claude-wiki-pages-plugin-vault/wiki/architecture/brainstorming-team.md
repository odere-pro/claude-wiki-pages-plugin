---
title: "Brainstorming Team"
type: entity
entity_type: organization
aliases: ["Brainstorming Team", "brainstorming team", "wiki-brainstorm", "ideation team"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Design: Teams and Agents]]", "[[Agent Teams]]"]
related: ["[[Engineering Team]]", "[[Four-Layer Stack]]", "[[Orchestrator Agent]]"]
tags: ["entity", "organization", "dev-team"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Brainstorming Team

## Overview

The brainstorming team is a dev-only Claude Code agent team (not a runtime plugin component) stored in `.claude/teams/wiki-brainstorm/`. It consists of 11 personas that collaborate to generate ideas, challenge assumptions, and produce phased roadmap proposals. The team operates independently of the plugin's runtime agents — it exists to drive the plugin's own design and development, not to serve end users.

## Key Facts

**Composition (11 personas):**
- Product Manager — frames problems and acceptance criteria
- Architect — technical feasibility and structural choices
- Structure-Authoring Architect — information architecture and content modeling
- Ontology Engineer — predicate definitions and vocabulary
- Senior Engineer — implementation depth and tradeoffs
- Plugin Expert — deep plugin API knowledge
- Plugin Power User — heavy real-world vault usage perspective
- New Claude User — onboarding friction and first-impressions
- Claude Code Config Expert — hooks, settings, and slash-command mechanics
- Grill-Me Interrogator — stress-tests proposals with adversarial questions
- Skeptic — challenges assumptions and resists premature convergence

**Three-round protocol:** Divergence (free ideation) → Cross-critique (each persona challenges others) → Convergence (synthesize into a proposal). The protocol prevents premature consensus and ensures adversarial review before a proposal reaches the [[Engineering Team]].

**Output:** Phased roadmap proposals. These are transient — they inform the engineering team's work but are not themselves shipped artifacts. The engineering team converts accepted proposals into ADRs and implementations.

**Handoff:** Brainstorming team proposal → Architect ratifies as ADRs → engineering team implements → gate-green → shipped.

**Non-negotiables shared with the engineering team:** NO RAG, structural provenance, DRY, ontology-in-schema, structured authoring, glossary-first, KISS/YAGNI.

## Related

- [[Engineering Team]] — receives the brainstorming team's proposals and implements them
- [[Four-Layer Stack]] — the architecture both teams reason about
- [[Orchestrator Agent]] — one of the 7 runtime agents that the brainstorming team designs for
