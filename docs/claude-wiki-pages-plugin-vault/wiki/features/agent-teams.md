---
title: "Agent Teams"
type: concept
aliases: ["agent teams", "Agent Teams", "dev teams", "wiki-dev", "wiki-brainstorm"]
parent: "[[features|Features]]"
path: "features"
sources: ["[[docs-teams|Agent Teams]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "teams", "development"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Agent Teams

Two dev-only agent teams under `.claude/teams/` that plan and build the plugin itself; neither ships in the plugin runtime context.

## Definition

Two complementary teams serve different purposes in the plugin's development lifecycle. Neither is loaded as end-user session context. The handoff between them is the proposal: the brainstorming team produces it, the Architect ratifies settled decisions as ADRs, and the engineering team implements against those.

## Key Principles

**Brainstorming team (wiki-brainstorm).** 11 personas, UX and adoption focus. Produces phased roadmap proposals (transient working artifacts). Read-only on the plugin. Runs a three-round protocol: Divergence (isolated ideation) → Cross-critique (peer objections; Skeptic critiques all; Grill-Me Interrogator makes every proposal falsifiable) → Convergence (Product Manager merges into a roadmap with Architect's coherence sign-off). External dependency: grill-me skill (not in this repo).

Roles: product-manager (facilitator + roadmap write), architect (four-layer coherence + ADR candidates), structure-authoring-architect, ontology-engineer, senior-engineer, plugin-expert, plugin-power-user, new-claude-user, claude-code-config-expert, grill-me-interrogator, skeptic.

**Engineering team (wiki-dev).** 9 teammates, implements the four-layer roadmap. Four parallel lanes: Lane A (Retrieval & Engine), Lane B (Schema, Ontology & Multi-vault), Lane C (Ingest, Context & Memory), Lane D (Portability, UX/DX & Docs). Ships only what passes the gates.

Handoff chain: PM acceptance spec → Architect design verdict → engineer TDD → QA-functional (Tier 0+1, ≥80% coverage on changed code) → QA-adversarial (Tier 2–4 on retrieval/schema/firewall/raw/memory/local-model items) → PM acceptance → Delivery Lead integrates and runs final gate.

Both teams share non-negotiables: NO RAG / no embeddings, structural provenance, DRY single-sourcing, ontology-in-schema, structured authoring, glossary-first, KISS/YAGNI.

## Examples

Use the brainstorming team when a roadmap or direction is unclear — it diverges across perspectives, stress-tests proposals, and converges on a phased proposal. Use the engineering team when a direction is settled and needs building — it assigns items to lanes, builds them test-first, and ships only what passes the gates.

## Related Concepts

The engineering team implements decisions ratified as ADRs in `docs/adr/`. The QA adversarial lane maps to the five-tier test harness described in the features overview.
