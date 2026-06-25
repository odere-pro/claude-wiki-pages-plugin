---
title: "Design Feature Relations"
type: concept
aliases: ["design-feature-relations", "Design Feature Relations", "Claude Code feature map"]
parent: "[[design|Design]]"
path: "design"
sources: ["[[docs-design-feature-relations|Design — Claude Code Feature Relations]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "design", "architecture", "commands"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Design Feature Relations

A map of how all Claude Code building blocks connect in the claude-wiki-pages plugin: commands, agents, skills, hooks, rules, scripts, the engine, and the Claude Code platform capabilities (MCP, scheduled tasks, workflows).

## Definition

The feature-relations document (`docs/design/06-feature-relations.md`) distinguishes what the plugin defines (solid edges in the diagram) from what the Claude Code platform offers but this plugin does not (yet) configure (dashed nodes/edges).

## Key Principles

**Plugin-defined features:**
- 4 commands: `wiki` (entry), `onboarding`, `doctor`, `fill-gaps`
- 8 agents: orchestrator + onboarding/ingest/extract-worker/curator/analyst/polish/maintenance
- 26 skills: 14 action + 5 teaching + `voice` + obsidian references
- 7 hook events: Session/Prompt/PreTool/PostTool/SubagentStop/Stop/SessionEnd
- ~50 scripts: enforcement, lint/verify, eval harness, engine bridge
- Path-scoped rules in `rules/`
- Bun engine in `src/`

**Platform capabilities (not yet configured):** MCP servers (none configured; could back a skill), scheduled tasks (cron could trigger maintenance loop), workflows (could orchestrate agents).

**Connection rules:**
- Goals → teams → agents/skills (product goals drive dev teams, which produce the shipped artifacts)
- Commands → agents → skills → engine/scripts (the user-facing call chain)
- Hooks → scripts (orthogonal enforcement — fires on lifecycle events, runs scripts that gate the call chain)
- Rules constrain agents and skills (but don't execute code themselves)

## Examples

The KISS extension path for future automation: MCP, scheduled tasks, and workflows would plug into the same call chain without a new surface — no new commands, no new agents needed.

## Related Concepts

The design-drift gate (ADR-0013 Check 5d) verifies the counts in this diagram (8 agents, 26 skills, 4 commands, ~50 scripts) match the actual repo on every CI run.
