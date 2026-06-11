---
title: "Agent Teams"
type: concept
aliases: ["Agent Teams", "agent teams", "dev teams", "development teams"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Agent Teams]]"]
related: ["[[Brainstorming Team]]", "[[Engineering Team]]", "[[Four-Layer Stack]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [teams, development]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Agent Teams

Two dev-only agent teams that plan and build the plugin. Neither ships in the plugin and neither is loaded as end-user session context — they live under `.claude/teams/` and exist to plan and build the plugin itself.

| | Brainstorming team | Engineering team (wiki-dev) |
|---|---|---|
| Charter | UX & adoption ideation | Implement the four-layer roadmap |
| Output | Phased roadmap proposal (transient) | Shipped, gate-green changes + ADRs |
| Mode | Read-only on the plugin | Edits the plugin, lane by lane, behind gates |
| Lives in | `.claude/teams/wiki-brainstorm/` | `.claude/teams/wiki-dev/` + `.claude/agents/wiki-dev-*.md` |
| Headcount | 11 personas | 9 teammates |

See [[Brainstorming Team]] and [[Engineering Team]] for details.

---

# Brainstorming Team

11 personas; three-round protocol: Diverge → Cross-critique → Converge. The Product Manager holds the facilitator/synthesizer hat; the Architect co-owns architectural coherence at convergence. No separate Lead role.

**Personas**: product-manager, architect, structure-authoring-architect, ontology-engineer, senior-engineer, plugin-expert, plugin-power-user, new-claude-user, claude-code-config-expert, grill-me-interrogator, skeptic.

The `grill-me-interrogator` drives an external grill-me skill not in this repo.

**Output**: a phased roadmap proposal (transient working artifact). Nothing in the plugin changes.

---

# Engineering Team

9 roles (`wiki-dev-*`); parallel by lane, sequential by phase.

**Roles**: wiki-dev-manager (entry point), wiki-dev-pm, wiki-dev-architect, wiki-dev-eng-retrieval (Lane A), wiki-dev-eng-schema (Lane B), wiki-dev-eng-ingest (Lane C), wiki-dev-eng-ux (Lane D), wiki-dev-qa-functional, wiki-dev-qa-adversarial.

**Phase order**: Phase 0 → Phase 1 + Phase U (interleaved) → Phase 2 → Phase 3.

**Handoff chain**: PM acceptance spec → Architect design verdict → Engineer TDD → QA-functional → QA-adversarial → PM acceptance → Delivery Lead integrates and runs the final gate.

**Non-negotiables shared with brainstorming team**: NO RAG, structural provenance, DRY single-sourcing, ontology-in-schema, structured authoring, glossary-first, KISS/YAGNI.
