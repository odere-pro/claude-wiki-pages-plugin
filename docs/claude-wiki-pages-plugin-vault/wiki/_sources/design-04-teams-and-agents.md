---
title: "Design: Teams and Agents"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "teams", "agents"]
aliases: ["Design: Teams and Agents"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design: Teams and Agents

## Summary

Shows the two dev-only agent teams (brainstorming + engineering) and the 7 runtime plugin agents. The brainstorming team ideates; the engineering team implements. Both are read-only on the plugin until work is explicitly assigned.

## Key Claims

- Brainstorming team (11 personas): Product Manager, Architect, Structure-Authoring Architect, Ontology Engineer, Senior Engineer, Plugin Expert, Plugin Power User, New Claude User, Claude Code Config Expert, Grill-Me Interrogator, Skeptic.
- Engineering team (`wiki-dev`, 9 roles): Manager, PM, Architect, 4 engineers (lanes A-D), QA-functional, QA-adversarial.
- 7 runtime agents: orchestrator, onboarding, ingest, curator, analyst, polish, maintenance.
- Brainstorming output: phased roadmap proposals (transient). Engineering output: shipped ADRs + gate-green changes.
