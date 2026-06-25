---
title: "LLM Wiki Guide 01: Getting Started"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "user-guide", "install"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# LLM Wiki Guide 01: Getting Started

## Metadata

- File: `raw/repo/docs/llm-wiki/01-getting-started.md`
- Type: user guide

## Summary

Detailed first-run guide: prerequisites, confirming plugin is loaded (SessionStart hook fires), scaffolding the vault, verifying hook wiring with /doctor, the doctor check list (D01–D10), and troubleshooting common failures.

## Key Claims

Prerequisites: Claude Code installed, plugin installed (remote marketplace or local), Obsidian 1.5+ (optional), jq installed. Confirming plugin loaded: on session start the SessionStart hook should print a preamble reminding the LLM to read vault/CLAUDE.md — if not, vault not yet scaffolded, run /claude-wiki-pages:wiki. /claude-wiki-pages:doctor runs ten checks (D01–D10): D01 Claude Code version, D02 vault exists, D03 raw/ exists, D04 wiki/ exists, D05 CLAUDE.md has schema_version, D06 Bun installed, D07 jq installed, D08 git initialized, D09 hooks wired, D10 engine verify passes. Exit codes: 0 all pass, 1 fixable, 2 fatal. Doctor --fix auto-repairs fixable subset. Common failure: D06 Bun missing — install curl -fsSL https://bun.sh/install | bash, restart session. The plugin confirms the vault is functional by running /doctor immediately after /init.

Covers: First Run, Doctor Health Check, D01-D10, Hook Wiring, Prerequisites
