---
title: "Plugin README"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["plugin", "readme", "overview"]
aliases: ["Plugin README", "plugin-readme", "README"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Plugin README

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The main README for the `claude-wiki-pages` Claude Code plugin. Describes the four-layer stack (Data/Skills/Agents/Orchestration), prerequisites (Claude Code ≥ 2.0, bash/git/find, jq, Bun ≥ 1.2, Obsidian optional), installation via marketplace, and the single entry verb `/claude-wiki-pages:wiki`. Includes a Mermaid flowchart showing the orchestrator → specialist → engine → vault flow. Documents offline/local-model support via Ollama.

## Key Claims

- Single advertised entry verb: `/claude-wiki-pages:wiki` — the orchestrator probes state and dispatches automatically.
- Bun is recommended but optional; without it, verify/fix/heal/doctor commands are disabled.
- The plugin has 7 agents, 23+ skills, 3 slash commands, and 15 hooks.
- Offline ingestion and querying are available via Ollama (qwen3-coder:30b quality-gated).
- No telemetry; all settings local at `.claude/claude-wiki-pages/settings.json`.
- Licensed Apache 2.0; not affiliated with Anthropic, Obsidian, or Karpathy.
