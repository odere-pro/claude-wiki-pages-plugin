---
title: "Analyst Modes Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "analyst-modes"]
aliases: ["Analyst Modes Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Analyst Modes Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/analyst-modes/SKILL.md`
- Type: Skill definition for the `analyst-modes` reference skill

## Summary

The `analyst-modes` skill documents the five operating modes of the analyst agent and their two write-gates. Reference material — not an action. Covers Query, Dashboard, Document Compile, Extract, and Challenge modes.

## Key Claims

Covers: Analyst Modes Skill, Query Mode, Dashboard Mode, Document Compile Mode, Extract Mode, Challenge Mode, Dashboard-Write Gate, Synthesis-Write Gate.

Query mode: answer with wikilink citations, offer to save as synthesis (gated). Dashboard mode: Dataview live or static snapshot; Dataview writes to `wiki/dashboard.md` (gated), static to `vault/output/`. Document Compile mode: for scope > 10 pages, write a compile plan to `vault/output/_compile-plan-*.md` and request approval before reading. Extract mode: structured data extraction — Glob + Read + Grep, no awk heredocs inline. Challenge mode: query with adversarial framing to surface past decisions, contradictions, gaps, and arguments against the current approach.
