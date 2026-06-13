---
title: "Design: Feature Relations"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "features", "claude-code"]
aliases: ["Design: Feature Relations"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design: Feature Relations

## Summary

Documents the Claude Code platform features the plugin uses vs. plugin-defined capabilities. Counts: 7 agents, 24 skills, 3 commands, 7 hook events.

## Key Claims

- Claude Code features used: MCP servers (none currently), cron (via heartbeat), workflows (via agent chains), slash commands (3: wiki, onboarding, doctor), hooks (7 events).
- Plugin-defined: 24 skills (13 verbs + onboarding + 5 agent-teaching + obsidian-graph-colors + obsidian-vault + 3 MIT third-party), 7 agents, 3 commands.
- 7 hook events: SessionStart, UserPromptSubmit, PreToolUse (multiple), PostToolUse (multiple), SubagentStop (multiple).
- The design-drift gate (ADR-0013) checks count assertions in this file against reality.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]
- [[Deterministic Engine]]

## Concepts Covered

- [[Four-Layer Stack]]
- [[Hook System]]
- [[Design-Drift Gate]]
