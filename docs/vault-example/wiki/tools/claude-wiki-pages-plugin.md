---
title: "claude-wiki-pages Plugin"
type: entity
entity_type: tool
aliases: ["claude-wiki-pages Plugin", "claude-wiki-pages", "the plugin"]
parent: "[[Tools]]"
path: "tools"
sources:
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
  - "[[Review, Validate, Fix]]"
  - "[[Export Data, Create Output]]"
  - "[[Check the Dashboard]]"
  - "[[Query the Wiki]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[Claude Code]]"
  - "[[Obsidian]]"
  - "[[LLM Wiki Pattern]]"
  - "[[Hook-Enforced Guarantees]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 8
status: active
confidence: 1.0
---

# claude-wiki-pages Plugin

`claude-wiki-pages` is a Claude Code plugin that turns an Obsidian vault into a provenance-tracked, typed wiki following the [[LLM Wiki Pattern]]. It implements a four-layer stack: Data (`vault/`), Skills (`skills/`), Agents (`agents/`), and Orchestration (slash commands, hooks, scripts).

## The one command

```
/claude-wiki-pages:claude-wiki-pages-ingest-agent
```

Run this every time new sources are dropped into `vault/raw/`. Everything else is either setup (once) or diagnostic (occasional).

## Slash command reference

| Command | Purpose |
| --- | --- |
| `/claude-wiki-pages:init` | Scaffold a vault (once per project) |
| `/claude-wiki-pages:wiki` | Top-level orchestrator entry |
| `/claude-wiki-pages:status` | Health check — every hook green? |
| `/claude-wiki-pages:claude-wiki-pages-curator-agent` | Audit and repair the wiki |
| `/claude-wiki-pages:query` | Answer a question with citations |
| `/claude-wiki-pages:claude-wiki-pages-analyst-agent` | Cross-topic analysis, reports, challenge mode |
| `/claude-wiki-pages:synthesize` | Write a cross-topic synthesis note |

## What the plugin enforces

The plugin enforces its invariants at every tool-call boundary via the [[Hook-Enforced Guarantees]] system: frontmatter validity, wikilink format, raw/ immutability, attachment presence, and post-ingest structural integrity.
