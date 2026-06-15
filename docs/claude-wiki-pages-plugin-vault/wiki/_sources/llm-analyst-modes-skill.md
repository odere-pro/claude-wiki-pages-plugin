---
title: "Analyst Modes Skill (SKILL.md)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["skill", "analyst", "operating-modes", "write-gates"]
aliases: ["Analyst Modes Skill (SKILL.md)", "llm-analyst-modes-skill", "analyst-modes skill"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Analyst Modes Skill (SKILL.md)

## Metadata

- **Author:** claude-wiki-pages plugin
- **Publisher:** claude-wiki-pages plugin
- **Published:** 2026-06-13
- **URL:** raw/repo/llm/SKILL.md

## Summary

The `analyst-modes` skill (`skills/analyst-modes/SKILL.md`) is an agent-teaching reference skill for `claude-wiki-pages-analyst-agent`. It documents the five operating modes (Query, Dashboard, Document Compile, Extract, Challenge) and the two write-gates (Dashboard-write gate, Synthesis-write gate) in full procedural detail. The skill is `disable-model-invocation: true` — it is a reference, not an action. The agent reads this skill after selecting a mode in preflight; schema authority remains `vault/CLAUDE.md`.

Mode 1 (Query) is a 8-step read-and-synthesize cycle ending in a `## Sources` section. Mode 2 (Dashboard) produces a Dataview live dashboard or a static snapshot with standard metrics. Mode 3 (Document Compile) reconstructs named documents (ADR, report, memo, brief, runbook) from wiki pages to `vault/output/`. Mode 4 (Extract) pulls structured data into tables, lists, or CSV. Mode 5 (Challenge) is an adversarial query that searches for contradictions, gaps, low-confidence claims, and counter-arguments.

The Dashboard-write gate requires a plan file and explicit approval before writing `wiki/dashboard.md`. The Synthesis-write gate requires a plan file and explicit approval before writing to `wiki/_synthesis/`.

## Key Claims

- The skill is `disable-model-invocation: true` — reference only; the agent reads it, the skill never acts.
- Five modes with distinct procedures: Query (cited answer), Dashboard (metrics/Dataview), Document Compile (structured deliverable), Extract (table/CSV), Challenge (adversarial pushback).
- Mode 2 (Dashboard) distinguishes live Dataview dashboard (`wiki/dashboard.md`, gated) from static snapshot (`vault/output/`, ungated).
- Mode 3 (Document Compile) requires a compile plan for scope >10 pages; output always goes to `vault/output/`.
- Confidence discipline: a dashboard over pages with average confidence <0.6 must include a caveat row.
- Dashboard-write gate: plan file → explicit approve/edit/abort → write only on approval.
- Synthesis-write gate: plan file → explicit approve/edit/abort → write + citation re-verify → log entry.
