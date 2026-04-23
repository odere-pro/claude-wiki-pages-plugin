---
title: "Claude Code"
type: entity
entity_type: tool
aliases: ["Claude Code", "claude-code"]
parent: "[[Tools — Index]]"
path: "tools"
sources: ["[[Karpathy LLM Wiki Gist]]"]
related: ["[[Obsidian]]", "[[Hook-Enforced Guarantees]]"]
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---

# Claude Code

## Overview

A CLI harness for running Claude against a local project. Skills, agents, and hooks are the three primitives; the harness orchestrates tool calls, intercepts them with hooks, and runs subagents that compose skills.

## Key Facts

- **Skills.** Single-responsibility capabilities invoked by slash command.
- **Agents.** Multi-step executors that compose skills.
- **Hooks.** Shell commands triggered at lifecycle points (`PreToolUse`, `PostToolUse`, `SubagentStop`, `SessionStart`, `UserPromptSubmit`). Hooks can block tool calls by exit code.
- **Plugins.** A distribution format for skills + agents + hooks + rules — the format `llm-wiki-stack` ships as.

## Related

- [[Obsidian]] — the vault format this plugin maintains through Claude Code hooks.
- [[Hook-Enforced Guarantees]] — the pattern this stack layers on Claude Code's hook system.
