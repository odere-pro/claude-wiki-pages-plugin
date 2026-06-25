---
title: "README"
type: source
source_type: manual
source_format: text
url: "https://github.com/odere-pro/claude-wiki-pages-plugin"
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["root", "readme", "overview"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# README

## Metadata

- **File**: `raw/repo/root/README.md`
- **Scope**: Root repository README
- **Type**: User-facing documentation

## Summary

The public README for the claude-wiki-pages plugin. Introduces the plugin as "Karpathy's LLM Wiki, shipped as a Claude Code plugin — four layers, hook-enforced." Covers prerequisites, installation, quickstart, documentation table, privacy statement, and license.

## Key Claims

One verb entry point: `/claude-wiki-pages:wiki`. The orchestrator probes state and dispatches: no vault → init wizard, new files in `raw/` → ingest agent, pending lint → curator agent, analytical prompt → analyst agent. Prerequisites: Claude Code >=2.0, bash/git/find, jq, Bun >=1.2, a git repo for the vault, optional Obsidian. macOS one-liner: `curl -fsSL https://raw.githubusercontent.com/odere-pro/claude-wiki-pages-plugin/main/install-macos.sh | bash`. No telemetry. Apache-2.0. Counts: 1 vault, 26 skills, 8 agents, 4 commands, 16 hooks, 4 rules files, 5 test tiers. Credits: Karpathy LLM Wiki pattern, kepano/obsidian-skills (MIT), Anthropic, Obsidian.
Covers: Plugin Overview, Installation, Quickstart, Four-Layer Stack, Prerequisites
