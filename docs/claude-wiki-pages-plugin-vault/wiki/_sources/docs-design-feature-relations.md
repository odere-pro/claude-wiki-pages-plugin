---
title: "Design — Claude Code Feature Relations"
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

# Design — Claude Code Feature Relations

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

The feature-relations diagram document (`docs/design/06-feature-relations.md`) maps how all Claude Code building blocks connect in this plugin: commands, agents, skills, hooks, rules, scripts, the engine, and the platform capabilities (MCP, scheduled tasks, workflows). It distinguishes what the plugin defines from what the Claude Code platform offers.

## Key Claims

Plugin defines: 4 commands, 8 agents, 26 skills, 7 hook events, ~50 scripts, path-scoped rules, Bun engine. Platform offers (not yet configured): MCP servers, scheduled tasks (cron for maintenance loop), workflows (multi-agent orchestration). Connection rules: goals → teams → agents/skills; commands → agents → skills → engine/scripts; hooks → scripts (orthogonal enforcement); rules constrain (don't execute). Platform features are extension points — the KISS path for future automation without a new surface.

Covers: Claude Code Feature Relations, Plugin vs Platform Boundary, Commands-Agents-Skills Chain, Hooks Enforcement
