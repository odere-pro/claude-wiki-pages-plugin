---
title: "Claude Code"
type: entity
entity_type: product
aliases: ["Claude Code", "claude-code"]
parent: "[[Tools — Index]]"
path: "tools"
sources:
  - "[[Using llm-wiki-stack]]"
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
related: ["[[llm-wiki-stack]]", "[[Obsidian]]", "[[LLM Wiki Pattern]]"]
tags: ["tool", "cli"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.9
---

# Claude Code

## Overview

Anthropic's CLI harness for running skills, agents, and hook-driven workflows. The host environment for the `llm-wiki-stack` plugin — all slash commands, hooks, and agents execute inside a Claude Code session.

## Key Facts

- Invoked as `claude` in a terminal; `claude --version` confirms installation.
- Plugins are installed via `/plugin marketplace add <source>` + `/plugin install <name>` at the Claude Code prompt.
- Hooks are shell scripts Claude Code runs at well-defined lifecycle points (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`).

## Related

- [[llm-wiki-stack]] — the plugin that runs inside Claude Code.
- [[Obsidian]] — the editor Claude Code's wiki output is designed to be read in.
