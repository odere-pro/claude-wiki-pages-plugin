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

Anthropic's AI-powered coding CLI — the runtime host for the `claude-wiki-pages` plugin's hook bus and slash commands.

## Overview

Claude Code is the Layer 4 Orchestration runtime in which the plugin operates. It resolves slash commands (e.g. `/claude-wiki-pages:init`, `/claude-wiki-pages:wiki`), fires the hook bus events (`SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`) as tool calls execute, and maintains session context across an interactive coding session.

The plugin is installed into Claude Code once globally; individual vaults are set per project using `bash scripts/set-vault.sh <path>`. Prerequisites are: `claude --version` works in a terminal, and `jq` is installed (required by hook scripts).

## Key Facts

Installation uses two commands — `/plugin marketplace add odere-pro/claude-wiki-pages-plugin` followed by `/plugin install claude-wiki-pages`. Local contributor installs substitute a filesystem path for the marketplace slug.

On session start, the `SessionStart` hook fires `session-start.sh`, which emits a short preamble reminding the LLM to read `vault/CLAUDE.md` before any wiki operation. If this preamble does not appear, the hook is not wired — run `/claude-wiki-pages:init` first.

The `PreToolUse` hook events are the primary enforcement layer. They fire before every file write and run `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, and `validate-attachments.sh` as appropriate. Writes that fail any check are blocked before the file is created.

`SubagentStop` events gate agent completions. After the ingest agent stops, `subagent-ingest-gate.sh` runs `verify-ingest.sh`; after the curator agent stops, `subagent-lint-gate.sh` checks for unresolved errors. Both abort completion on failure.

## Related

- [[claude-wiki-pages Plugin]] — the plugin installed into and hosted by Claude Code.
- [[Hook-Enforced Guarantees]] — the hook bus events and scripts that Claude Code dispatches.
