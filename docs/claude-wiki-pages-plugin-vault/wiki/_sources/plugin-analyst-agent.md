---
title: "Analyst Agent Source"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["agent", "analyst", "plugin"]
aliases: ["Analyst Agent Source", "plugin-analyst-agent", "claude-wiki-pages-analyst-agent source"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Analyst Agent Source

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The canonical agent definition file for `claude-wiki-pages-analyst-agent`. Declares model: sonnet, tools: Bash/Read/Write/Edit/Glob/Grep. Specifies five operating modes: 1 Query (cited answer), 2 Dashboard (metrics), 3 Compile (ADR/report/memo), 4 Extract (table/CSV/list), 5 Challenge (adversarial push-back). Mode gate: pick exactly one per run; ask when ambiguous. Page budget: 100 pages/run default, hard cap 500. Grounding ledger: every Mode 1/3/4 output ends with a `## Sources` section in research-paper style. Citation re-verify step: extract every wikilink, confirm file exists. Two write gates: Dashboard gate and Synthesis-write gate.

## Key Claims

- Analyst uses model: sonnet and tools: Bash, Read, Write, Edit, Glob, Grep (no Task).
- Five modes: Query, Dashboard, Compile, Extract, Challenge — one per run.
- All three query-type modes (1, 3, 4) require a `## Sources` grounding ledger with raw source paths.
- Citation re-verify is mandatory: every wikilink in output must resolve to an existing file.
- Dashboard → `dashboard.md` write requires a plan file and explicit approval.
- Synthesis → `_synthesis/` write requires a plan file and explicit approval.
- Vault/raw/ content and user-supplied assumptions (Mode 5) are both untrusted input.
