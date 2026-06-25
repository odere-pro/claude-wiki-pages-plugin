---
title: "Design Teams and Agents"
type: concept
aliases: ["design-teams-and-agents", "Design Teams and Agents", "teams and agents diagram"]
parent: "[[design|Design]]"
path: "design"
sources: ["[[docs-design-teams-agents|Design — Teams and Agents]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "design", "agents", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Design Teams and Agents

A diagram perspective showing how the two dev teams (wiki-brainstorm, wiki-dev) and the eight runtime agents relate — who produces what, and who ships versus who stays in development.

## Definition

The teams-and-agents document (`docs/design/04-teams-and-agents.md`) makes explicit that dev teams and runtime agents are entirely different populations: teams live in `.claude/teams/` and are never shipped; runtime agents live in `agents/` and are the plugin's execution layer.

## Key Principles

**Two dev teams, two purposes.** Wiki-brainstorm ideates (read-only, proposal-only: PM, architect, 9 personas, three-round protocol — diverge/cross-critique/converge). Wiki-dev builds (implements behind test gates: manager, 4 lanes A–D, QA functional + adversarial). Handoff from brainstorm to dev is a roadmap artifact.

**Engineering handoff chain.** PM acceptance spec → architect design verdict → lane engineer (TDD) → QA-functional (Tier 0–1, coverage) → QA-adversarial (Tier 2–4) → PM acceptance → manager integration + final gate.

**Eight runtime agents.** Orchestrator (entry — probes vault, dispatches), onboarding, ingest, curator, analyst, polish, maintenance, extract-worker (read-only fan-out, spawned by ingest only, never dispatched by orchestrator directly). All eight follow the `claude-wiki-pages-{role}-agent` naming convention (ADR-0002).

**Dev teams ≠ runtime agents.** `wiki-dev-*` and brainstorm personas never ship. The 8 `claude-wiki-pages-*-agent` files in `agents/` are runtime context loaded on install.

## Examples

The extract-worker is the only agent the orchestrator does not dispatch directly — only the ingest-agent spawns it (when `maxParallelExtract > 1`). This is explicit in the diagram to prevent misuse.

## Related Concepts

The runtime agent dispatch logic is specified in ADR-0001 (orchestrator-first) and the ingest pipeline agent contract. ADR-0002 defines the naming convention all eight agents follow.
