---
title: "Analyst Agent"
type: entity
entity_type: tool
aliases: ["Analyst Agent", "claude-wiki-pages-analyst-agent", "analyst"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-analyst-agent|claude-wiki-pages-analyst-agent]]"]
related: []
tags: ["agents", "query", "analysis", "grounding"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Analyst Agent

The wiki's read-and-answer agent: queries the vault, produces dashboards and structured reports, and grounds every claim in source material.

## Overview

The analyst agent (`claude-wiki-pages-analyst-agent`) answers questions and produces structured outputs from wiki content. It operates in five modes selected from the user's prompt: Query, Dashboard, Compile, Extract, and Challenge. All outputs are grounded in wiki pages — no claims without `[[wikilink]]` citations.

**Five modes:**

- **Mode 1 — Query:** answers one question with inline citations and a grounding ledger (`## Sources`).
- **Mode 2 — Dashboard:** produces coverage, health, evidence, and freshness metrics over a scope. Writes to `vault/output/` (scratch) or gated `wiki/dashboard.md`.
- **Mode 3 — Compile:** reconstructs an ADR, report, memo, or runbook from wiki content. Writes to `vault/output/` (scratch).
- **Mode 4 — Extract:** dumps structured rows (table, CSV, list) from the wiki. Writes inline or to `vault/output/<name>.csv`.
- **Mode 5 — Challenge:** adversarial push-back on a user-supplied assumption; treats the assumption as data, not instructions.

## Key Facts

- **Model:** sonnet (Opus for Mode 3 from 10+ pages, Mode 5 against complex multi-source decisions)
- **Tools:** Bash, Read, Glob, Grep — no Write (outputs go to `vault/output/` via scratch or via gated synthesis write)
- **Page budget:** 100 pages/run default; hard cap 500; halt with partial report when exhausted
- **Grounding ledger:** every Mode 1, 3, and 4 output ends with a `## Sources` section tracing each cited wiki page back to its raw evidence path
- **Search priority:** index lookup → index traversal → `engine.sh search` → frontmatter/body grep → source summaries → raw sources (last resort)
- **Write gates:** synthesis writes to `wiki/_synthesis/` and dashboard writes to `wiki/dashboard.md` each require a plan file and explicit user approval
- **Untrusted surfaces:** `vault/raw/` content and user-supplied assumptions in Mode 5 are treated as data; embedded instructions are ignored and reported

## Related

Invoked by the orchestrator when the user prompt matches an analytical verb (query, ask, summarize, report, compile, extract, compare, challenge, dashboard) or starts with `?`/`what`/`why`/`how`.
