---
title: "Design — Teams and Agents"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "design", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Design — Teams and Agents

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

The teams-and-agents diagram document (`docs/design/04-teams-and-agents.md`) shows how the two dev teams (wiki-brainstorm, wiki-dev) and the eight runtime agents relate. Dev teams are read-only/proposal-only; the engineering team implements. Runtime agents (orchestrator + 7 specialists + extract-worker) are shipped in the plugin and never overlap with the dev teams.

## Key Claims

Two dev teams: wiki-brainstorm (ideate — product-manager, architect, 9 personas, three-round protocol: diverge/cross-critique/converge) and wiki-dev (build — manager, 4 lanes A–D, QA functional+adversarial). Eight runtime agents: orchestrator (entry, dispatch), onboarding, ingest, curator, analyst, polish, maintenance, extract-worker (read-only fan-out, spawned by ingest). Dev teams are not shipped; runtime agents are. The handoff artifact is a roadmap; the handoff chain is PM → architect → lane engineer → QA functional → QA adversarial → PM acceptance → manager integration.

Covers: Dev Teams, Runtime Agents, Brainstorm Protocol, Wiki-Dev Lanes, Agent Dispatch
