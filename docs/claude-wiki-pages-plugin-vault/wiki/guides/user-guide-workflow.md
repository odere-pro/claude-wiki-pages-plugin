---
title: "User Guide Workflow"
type: concept
aliases: ["user guide workflow", "User Guide Workflow", "llm-wiki user guides", "user documentation"]
parent: "[[guides|Guides]]"
path: "guides"
sources: ["[[docs-llm-wiki-index|LLM Wiki User Guide Index]]", "[[docs-llm-wiki-getting-started|LLM Wiki Guide 01: Getting Started]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "user-guide", "workflow"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# User Guide Workflow

Seven user guides that walk through every step of using the plugin, from install to query — the user-facing documentation layer distinct from the API and architecture references.

## Definition

The `docs/llm-wiki/` directory contains seven numbered guides that together cover the end-to-end user workflow. They are the practical companion to the quickstart and are written for people who have never used the plugin before.

## Key Principles

**Seven-guide sequence:**

| Guide | What it covers |
| --- | --- |
| `01-getting-started.md` | Install, verify, run `/claude-wiki-pages:doctor` |
| `02-create-new-knowledge-base.md` | Run `/claude-wiki-pages:init` wizard; scaffold vault; orient new users |
| `03-update-existing.md` | Add raw sources to `vault/raw/`; run ingest pipeline; understand log |
| `04-review-validate-fix.md` | Run `/claude-wiki-pages:doctor`; interpret D01–D10 checks; lint + fix |
| `05-export-outputs.md` | `/claude-wiki-pages:markdown` for portable export; output path |
| `06-check-the-dashboard.md` | `/claude-wiki-pages:status` dashboard; reading staleness indicators |
| `07-query-the-wiki.md` | `/claude-wiki-pages:query`; search operators; reading structured answers |

**Guide 01 details (Install and verify).** Three install paths: one-command macOS installer, marketplace install (recommended), local/contributor install. Post-install: always run `/claude-wiki-pages:doctor` — checks D01 (Claude Code version ≥ 2.0), D02 (vault structure), D03 (Bun installed), D04 (jq installed), D05 (git installed), D06 (hooks wired), D07 (engine verify). `--fix` auto-repairs D02–D06. If everything is `OK`: ready. Any `FAIL[N]`: follow the remedy in the guide.

**First run experience.** The `SessionStart` hook prints a preamble with the vault path and next step. If nothing prints: vault not scaffolded yet — run `/claude-wiki-pages:wiki`. A clean install takes under five minutes from zero.

**Goal of the user doc layer.** A new user should reach "first cited answer from their own sources in < 10 minutes". The guides are optimized for this: no theory before the first successful command, only the context needed to act.

## Examples

A user who ran `/claude-wiki-pages:doctor` and sees `FAIL[D03]: Bun not found` follows the remedy in Guide 01: install Bun (`curl -fsSL https://bun.sh/install | bash`), open a new terminal, re-run doctor. The check structure makes the fix unambiguous.

## Related Concepts

The getting started guide is the quickstart companion to this workflow. The installation guide covers the three install paths in depth. The operations reference covers the orchestrator dispatch table that the guides implicitly depend on.
