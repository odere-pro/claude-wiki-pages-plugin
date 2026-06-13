---
title: "Claude Code"
type: entity
entity_type: tool
aliases: ["Claude Code"]
parent: "[[Tools]]"
path: "tools"
sources:
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[claude-wiki-pages Plugin]]"
  - "[[Hook-Enforced Guarantees]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Claude Code

Claude Code is Anthropic's AI-powered coding environment (CLI). It hosts the `claude-wiki-pages` plugin's hook bus, resolves slash commands, and maintains the session context in which the plugin operates.

## Role in the stack

Claude Code is the Layer 4 Orchestration runtime host. The plugin's hooks (`SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`) fire as Claude Code executes tool calls. The slash commands (`/claude-wiki-pages:init`, `/claude-wiki-pages:wiki`, etc.) are resolved by Claude Code's plugin system.

## Prerequisites

- `claude --version` must work in a terminal before using the plugin.
- `jq` must be installed (required by hook scripts).

## Plugin installation

```
/plugin marketplace add odere-pro/claude-wiki-pages-plugin
/plugin install claude-wiki-pages
```

Local (contributor / fork) installs use the filesystem path instead of the marketplace slug.
