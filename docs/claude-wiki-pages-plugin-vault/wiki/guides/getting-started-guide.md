---
title: "Getting Started Guide"
type: concept
aliases: ["getting started guide", "Getting Started Guide", "quickstart"]
parent: "[[guides|Guides]]"
path: "guides"
sources: ["[[docs-getting-started|Getting Started]]", "[[docs-llm-wiki-index|LLM Wiki User Guide Index]]", "[[docs-llm-wiki-getting-started|LLM Wiki Guide 01: Getting Started]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "onboarding", "quickstart"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Getting Started Guide

A flat list of CLI commands to go from nothing to querying a populated wiki, plus the seven user guides that cover each step in depth.

## Definition

The plugin has two entry points for new users: the quickstart CLI sequence (eight commands, flat) and the seven-guide user documentation sequence under `docs/llm-wiki/`. Both lead to the same place: a running vault answering questions.

## Key Principles

**Eight-step quickstart:**

1. `cd ~/your-project && claude` — start Claude Code
2. `/plugin marketplace add odere-pro/claude-software-3-0-marketplace` and `/plugin install claude-wiki-pages` — install plugin
3. `/claude-wiki-pages:init` — create a new vault (or specify path: `init my vault is docs/vault`)
4. `!cp ~/Downloads/*.md vault/raw/` — import raw files
5. `/claude-wiki-pages:wiki` — run the pipeline (probes state, picks right specialist automatically)
6. `/claude-wiki-pages:status` — check status
7. `/claude-wiki-pages:query what does the wiki say about <topic>?` — query the wiki
8. `/claude-wiki-pages:markdown what does the wiki say about <topic>?` — export as portable markdown to `vault/output/`

**Confirming the plugin is loaded.** On session start the `SessionStart` hook should print a preamble reminding the LLM to read `vault/CLAUDE.md`. If absent: vault not yet scaffolded — run `/claude-wiki-pages:wiki`.

**After install, always verify:** `/claude-wiki-pages:doctor` runs ten checks (D01–D10) covering Claude Code version, vault structure, Bun, jq, git, hook wiring, and engine verify. Exit 0 = all pass; exit 1 = fixable; exit 2 = fatal. `--fix` auto-repairs the fixable subset.

**Seven user guide sequence:**
1. Install and verify — [01-getting-started.md]
2. Create vault — [02-create-new-knowledge-base.md]
3. Add sources and ingest — [03-update-existing.md]
4. Validate and repair — [04-review-validate-fix.md]
5. Query the wiki — [07-query-the-wiki.md]
6. Check the dashboard — [06-check-the-dashboard.md]
7. Produce outputs — [05-export-outputs.md]

## Examples

A fresh Mac user: `curl -fsSL install-macos.sh | bash` (installs Homebrew, git, jq, Bun), then the marketplace install steps, then `/claude-wiki-pages:wiki`.

## Related Concepts

The installation guide covers the three install paths in detail. The operations reference covers the orchestrator dispatch table and vault resolution.
