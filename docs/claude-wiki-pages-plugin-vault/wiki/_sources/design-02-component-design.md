---
title: "Design: Component Design"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "components", "hooks"]
aliases: ["Design: Component Design"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design: Component Design

## Summary

L2 component diagram mapping hooks to scripts, distinguishing action skills from teaching skills, and documenting the engine command surface. Also contains a patterns mindmap.

## Key Claims

- Hook events map 1:1 to scripts: `SessionStart` → `session-start.sh`, `PreToolUse` → `validate-frontmatter.sh`/`check-wikilinks.sh`/`protect-raw.sh`/`firewall.sh`, `PostToolUse` → `post-wiki-write.sh`, `SubagentStop` → `subagent-ingest-gate.sh`/`subagent-commit-gate.sh`.
- Action skills vs teaching skills: action skills execute tasks; teaching skills (agent-teaching) provide reference material for agents.
- Engine commands: verify, heal, search, doctor, propose, migrate, route, backlog.
- Design patterns: specialist agent, firewall confinement, git-checkpoint, provenance chain.

## Entities Mentioned

- [[Deterministic Engine]]
- [[Firewall]]

## Concepts Covered

- [[Four-Layer Stack]]
- [[Hook System]]
- Teaching Skill (agent-teaching skills provide reference material for agents, distinct from action skills)

## Grounded Pages

Wiki pages that cite this source:

- [[Design Diagrams]] — L2 component design perspective
- [[Hook System]] — hook-to-script wiring
