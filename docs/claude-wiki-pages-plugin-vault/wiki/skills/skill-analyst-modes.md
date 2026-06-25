---
title: "Analyst Modes Skill"
type: entity
entity_type: tool
aliases: ["Analyst Modes Skill", "analyst-modes", "/claude-wiki-pages:analyst-modes", "analyst operating modes"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-analyst-modes|Analyst Modes Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "analyst-modes", "analyst"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Analyst Modes Skill

The `analyst-modes` skill documents the five operating modes of the analyst agent (Query, Dashboard, Document Compile, Extract, Challenge) and their two write-gates — reference material for the agent to read after selecting a mode.

## Overview

Reference material, not an action. The analyst agent reads this skill during preflight. Schema authority remains `vault/CLAUDE.md`; the budget, untrusted-input, citation, and logging rules live in the agent body.

## Key Facts

**Five operating modes**:

| Mode | Purpose | Write target |
|---|---|---|
| 1 Query | Answer a question with wikilink citations | `log.md` only |
| 2 Dashboard | Dataview live dashboard or static snapshot with metrics | `wiki/dashboard.md` (gated) or `vault/output/` |
| 3 Document Compile | Reconstruct a full document (ADR, report, proposal, memo, brief, runbook) | `vault/output/` |
| 4 Extract | Structured data from the wiki into tables, lists, or machine-readable formats | none / `vault/output/` |
| 5 Challenge | Query with adversarial framing to surface contradictions and gaps | `log.md` only |

**Two write-gates**:
- Dashboard-write gate: required before writing to `wiki/dashboard.md`
- Synthesis-write gate: required before filing a substantial query answer as a new synthesis page; do not write without the user opting in

**Document Compile scope threshold**: when scope > 10 pages, write a compile plan to `vault/output/_compile-plan-YYYY-MM-DD-<slug>.md` and request approval before reading any page.

**Dashboard metrics catalog**: Coverage (pages per topic, per type, source count), Health (orphan pages, broken links, stale pages, low confidence), Evidence (avg `update_count`, sources per page, confidence distribution), Freshness (pages updated in last 7/30/90 days), Connectivity (avg `related` links, most/least linked), Gaps (entities mentioned in prose but lacking their own page).

## Related

Implemented by the analyst agent, which dispatches to one of these modes based on the prompt verbs.
