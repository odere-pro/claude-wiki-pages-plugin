---
title: "Feature Relations"
type: concept
aliases: ["Feature Relations", "feature relations", "Claude Code feature map"]
parent: "[[Design]]"
path: "design"
sources: ["[[06-feature-relations]]"]
related: ["[[System Context]]", "[[Component Design]]", "[[Orchestration Layer]]"]
tags: [design, features, claude-code]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Feature Relations

How the Claude Code building blocks connect in this repo — distinguishing what the plugin **defines** from what the Claude Code **platform** offers.

## The Claude Code Platform (not defined by this plugin)

- **MCP servers** — the plugin does not define MCP servers; it uses none.
- **Scheduled tasks (cron)** — the plugin does not create system cron entries; `maintenance.enabled` plus a user-managed scheduler is the pattern.
- **Workflows** — not used; the plugin uses hooks and agents instead.

## What the Plugin Defines

- **11 product goals** — the stated user outcomes the plugin aims to achieve.
- **3 commands** — `wiki`, `onboarding`, `doctor`.
- **7 agents** — orchestrator + 6 specialists.
- **24 skills** — 13 action + 1 onboarding + 5 agent-teaching + 2 Obsidian + 3 third-party.
- **7 hook events** — `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`, `SessionEnd`.
- **~30 scripts** — bash implementations of the hook logic.
- **Path-scoped rules** — declarative guidance files in `rules/`.
- **Bun engine** — deterministic validation CLI (`src/`).

## Dev-Time Constructs (not shipped)

- **Brainstorm team** (`.claude/teams/wiki-brainstorm/`) — produces roadmap proposals.
- **Engineering team** (`.claude/teams/wiki-dev/`) — implements against the roadmap.
- **Design docs** (`docs/design/`) — visual documentation of architecture and sequences.

These are dev-time constructs inside `docs/` and `.claude/`. They are not copied into a user's vault on install.
