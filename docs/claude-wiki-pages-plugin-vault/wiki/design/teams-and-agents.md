---
title: "Teams and Agents"
type: concept
aliases: ["Teams and Agents", "teams and agents", "dev teams", "wiki-dev team"]
parent: "[[Design]]"
path: "design"
sources: ["[[04-teams-and-agents]]"]
related: ["[[Agent Roles]]", "[[System Context]]"]
tags: [design, teams, development]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Teams and Agents

How the **dev teams** (build the plugin) and the **runtime agents** (run inside the installed plugin) work.

## Two Dev Teams

**Brainstorm team** (`.claude/teams/wiki-brainstorm/`) — ideation, roadmap proposals. Read-only / proposal-only. Has a facilitating product manager, an architect, and nine personas (ontology, authoring, skeptic, grill-me, users, config). The brainstorm team produces roadmap proposals in `tmp/` scratch.

**Engineering team** (`.claude/teams/wiki-dev/`) — implements behind test gates. Has four lanes (A=retrieval, B=schema, C=ingest, D=ux/dx), a delivery manager, a PM, and QA (functional + adversarial). The handoff from brainstorm is a roadmap document.

## The Handoff

The brainstorm team's roadmap is the input to the engineering team. The engineering team implements with TDD (80%+ coverage), functional QA (Tier 0 + Tier 1 green), adversarial QA (Tier 4 replay), and PM acceptance before an item is done.

## Runtime Agents (in the Installed Plugin)

See [[Agent Roles]] for the seven runtime agents and their dispatch table. Runtime agents are the executable artifacts; dev teams produce them.

## Brainstorm Protocol

Three rounds: (1) round-table discussion with all personas, (2) critique and skeptical pushback, (3) synthesis into a prioritized roadmap with ADR-gated items for shared mechanisms.
