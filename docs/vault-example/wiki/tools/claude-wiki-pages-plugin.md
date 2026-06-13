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

A Claude Code plugin that turns an Obsidian vault into a provenance-tracked, typed wiki following the [[LLM Wiki Pattern]], implemented as a four-layer stack.

## Overview

`claude-wiki-pages` installs into Claude Code as a plugin and exposes a set of slash commands, hook scripts, and agent definitions that collectively manage a vault's lifecycle. The four layers are: Data (`vault/`), Skills (`skills/`), Agents (`agents/`), and Orchestration (slash commands, hooks, scripts).

The primary entry point for end users is `/claude-wiki-pages:wiki` (the top-level orchestrator) and `/claude-wiki-pages:claude-wiki-pages-ingest-agent` (the ingest pipeline). Everything else is either setup (once) or diagnostic (occasional).

## Key Facts

One command for ongoing use — `/claude-wiki-pages:claude-wiki-pages-ingest-agent` processes all unprocessed files in `vault/raw/`, updates the wiki, and gates completion on `verify-ingest.sh`. Run it every time new raw sources are added.

Slash command set:

| Command | Purpose |
| --- | --- |
| `/claude-wiki-pages:init` | Scaffold a vault (once per project) |
| `/claude-wiki-pages:wiki` | Top-level orchestrator |
| `/claude-wiki-pages:status` | Health check — every hook green? |
| `/claude-wiki-pages:claude-wiki-pages-curator-agent` | Audit and repair the wiki |
| `/claude-wiki-pages:query` | Answer a question with citations |
| `/claude-wiki-pages:claude-wiki-pages-analyst-agent` | Cross-topic analysis, reports, challenge mode |
| `/claude-wiki-pages:synthesize` | Write a cross-topic synthesis note |

Schema authority — `vault/CLAUDE.md` is the single source of truth. Every skill and agent reads it before touching anything else. Customizing the schema means editing that file, not the plugin skills.

Hook enforcement — the plugin wires `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh`, `post-wiki-write.sh`, `subagent-ingest-gate.sh`, and `subagent-lint-gate.sh` into Claude Code's hook bus. These scripts enforce the [[Hook-Enforced Guarantees]] at every tool-call boundary.

## Related

- [[Claude Code]] — the runtime that hosts the plugin and dispatches its hook bus events.
- [[Obsidian]] — the note-taking app used as the vault viewer alongside the plugin.
- [[LLM Wiki Pattern]] — the pattern the plugin implements.
- [[Hook-Enforced Guarantees]] — the invariants the plugin enforces at every write boundary.
