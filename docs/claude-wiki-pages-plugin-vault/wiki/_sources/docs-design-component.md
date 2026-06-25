---
title: "Design: Component Design and Patterns"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "design", "hooks"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Design: Component Design and Patterns

## Metadata

- File: `raw/repo/docs/design/02-component-design.md`
- Type: design documentation (Mermaid diagrams)

## Summary

Visualizes the component design across all four layers with Mermaid diagrams. Shows orchestration components (hooks → scripts), agent patterns, skill entry points, and the data layer schema authority. Every hook event fans out to deterministic bash scripts — the enforcement spine.

## Key Claims

Orchestration (Layer 4): SessionStart → session-start.sh; UserPromptSubmit → prompt-guard.sh; PreToolUse(Read/Grep/Glob) → scope-guard.sh; PreToolUse(Write/Edit) → firewall.sh + validate-frontmatter.sh + check-wikilinks.sh + protect-raw.sh + validate-attachments.sh; PostToolUse(Write/Edit) → post-wiki-write.sh + post-ingest-summary.sh; SubagentStop → subagent-lint-gate.sh + subagent-ingest-gate.sh + subagent-tree-gate.sh + subagent-commit-gate.sh. Agent pattern (Layer 3): orchestrator-agent → Task(specialist-agent) → specialist uses skills. Skill pattern (Layer 2): slash command reads CLAUDE.md + SKILL.md; performs capability; emits structured output. Data layer (Layer 1): schema authority (skills/init/template/CLAUDE.md) → raw/ (immutable) + wiki/ (LLM-maintained) + _proposed/ (staging).

Covers: Component Design, Hook Events, Script Map, Agent Pattern, Layer 4 Orchestration
