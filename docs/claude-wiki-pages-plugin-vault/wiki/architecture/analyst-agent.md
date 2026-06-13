---
title: "Analyst Agent"
type: entity
entity_type: tool
aliases: ["Analyst Agent", "analyst agent", "claude-wiki-pages-analyst-agent", "analyst"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[User Guide 07: Query the Wiki]]", "[[User Guide 05: Export Outputs]]", "[[Operations Guide]]"]
related: ["[[Orchestrator Agent]]", "[[Query Rules]]", "[[Challenge Mode]]", "[[Synthesis Note]]"]
tags: ["agent", "analyst"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Analyst Agent

## Overview

The `claude-wiki-pages-analyst-agent` answers questions from the wiki, produces dashboards and reports, reconstructs documents, extracts information, and challenges assumptions. Five operating modes are selected from the prompt's verb.

## Key Facts

- **Slug:** `claude-wiki-pages-analyst-agent` (renamed from `llm-wiki-analyst` in 0.2.0).
- **Dispatch condition:** Analytical prompt (`what`, `why`, `compare`, …).
- **Five modes:**
  1. **Query** — answers a question with `[[wikilink]]` citations; ends with `## Sources`.
  2. **Dashboard** — produces a Dataview-ready or static summary of vault health.
  3. **Document Compile** — reconstructs a document (ADR, report, brief) from wiki pages.
  4. **Extract** — pulls structured data from wiki pages into a table or list.
  5. **Challenge** — adversarial querying: surfaces contradictions, gaps, counter-evidence.
- **Every answer ends with `## Sources`** — numbered, research-paper style (ADR-0022).

## Related

- [[Orchestrator Agent]] — dispatches to this agent for analytical prompts
- [[Query Rules]] — the structured query workflow
- [[Challenge Mode]] — the adversarial querying mode
- [[Synthesis Note]] — the analyst may offer to file a novel answer as a synthesis note
