---
title: "claude-wiki-pages-analyst-agent"
type: source
source_type: manual
source_format: text
attachment_path: ""
extracted_at: 2026-06-25
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["agents", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# claude-wiki-pages-analyst-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-analyst-agent.md

## Summary

Agent definition for the wiki analyst. Answers questions, produces dashboards and reports, extracts structured data, and generates challenge push-backs — all grounded in wiki source material. Operates in five modes: Query, Dashboard, Compile, Extract, and Challenge.

## Key Claims

- Five modes: Query (one-question answer), Dashboard (metrics), Compile (structured doc), Extract (tables/CSV), Challenge (adversarial push-back).
- Page budget: 100 pages/run default; hard cap 500.
- Synthesis writes to wiki/_synthesis/ require a plan file and explicit approval.
- Dashboard writes to wiki/wiki/dashboard.md require a plan file and explicit approval.
- Every Mode 1, 3, and 4 output ends with a grounding ledger (## Sources section).
- Model: sonnet. Tools: Bash, Read, Glob, Grep.

Covers: Analyst Agent, Query Mode, Dashboard Mode, Compile Mode, Extract Mode, Challenge Mode, Grounding Ledger
