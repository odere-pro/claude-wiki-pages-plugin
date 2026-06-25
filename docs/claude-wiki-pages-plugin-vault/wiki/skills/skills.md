---
title: "Skills"
type: index
aliases: ["skills", "Skills", "skill library", "plugin skills"]
parent: "[[index|Wiki Index]]"
path: "skills"
children:
  - "[[skill-init|Init Skill]]"
  - "[[skill-ingest|Ingest Skill]]"
  - "[[skill-query|Query Skill]]"
  - "[[skill-lint|Lint Skill]]"
  - "[[skill-fix|Fix Skill]]"
  - "[[skill-status|Status Skill]]"
  - "[[skill-synthesize|Synthesize Skill]]"
  - "[[skill-search|Search Skill]]"
  - "[[skill-review|Review Skill]]"
  - "[[skill-draft|Draft Skill]]"
  - "[[skill-engine-api|Engine API Skill]]"
  - "[[skill-maintain-contract|Maintain Contract Skill]]"
  - "[[skill-onboarding|Onboarding Skill]]"
  - "[[skill-fill-gaps|Fill Gaps Skill]]"
  - "[[skill-ingest-pipeline|Ingest Pipeline Skill]]"
  - "[[skill-analyst-modes|Analyst Modes Skill]]"
  - "[[skill-curator-fixes|Curator Fixes Skill]]"
  - "[[skill-voice|Voice Skill]]"
  - "[[skill-obsidian-vault|Obsidian Vault Skill]]"
  - "[[skill-obsidian-cli|Obsidian CLI Skill]]"
  - "[[skill-markdown|Markdown Skill]]"
  - "[[skill-index|Index Skill]]"
  - "[[skill-sync|Sync Skill]]"
  - "[[skill-obsidian-graph-colors|Obsidian Graph Colors Skill]]"
  - "[[skill-obsidian-markdown|Obsidian Markdown Skill]]"
  - "[[single-responsibility-skill-pattern|Single-Responsibility Skill Pattern]]"
child_indexes: []
tags: ["skills", "layer-2"]
created: 2026-06-25
updated: 2026-06-25
---

# Skills

Layer 2 of the claude-wiki-pages plugin: 25 single-responsibility capabilities that agents and commands invoke by name. Plus one cross-cutting concept.

## Core Pipeline Skills

Skills that form the primary ingest-query-maintain pipeline:

- [[skill-init|Init Skill]] — bootstrap a fresh vault from the reference scaffold
- [[skill-ingest|Ingest Skill]] — process raw sources into typed wiki pages
- [[skill-query|Query Skill]] — answer questions from the wiki with citations
- [[skill-lint|Lint Skill]] — audit the wiki for structural and provenance drift
- [[skill-fix|Fix Skill]] — auto-repair what lint reports
- [[skill-status|Status Skill]] — one-command hook health check
- [[skill-synthesize|Synthesize Skill]] — write cross-topic synthesis notes
- [[skill-search|Search Skill]] — deterministic keyword retrieval
- [[skill-review|Review Skill]] — promote or reject drafted pages from `_proposed/`
- [[skill-draft|Draft Skill]] — draft pages with a local model into `_proposed/`
- [[skill-fill-gaps|Fill Gaps Skill]] — close dangling links and thin coverage
- [[skill-sync|Sync Skill]] — pull changes from a wired source repository
- [[skill-markdown|Markdown Skill]] — export wiki answers as portable markdown
- [[skill-index|Index Skill]] — refresh the vault MOC at `wiki/index.md`

## Reference / Teaching Skills

Skills that document contracts and procedures for agents to read:

- [[skill-engine-api|Engine API Skill]] — LLM-facing contract for the deterministic Bun engine
- [[skill-maintain-contract|Maintain Contract Skill]] — safe ingest/retrieve/maintain ordering
- [[skill-onboarding|Onboarding Skill]] — guided first-run tour contract
- [[skill-ingest-pipeline|Ingest Pipeline Skill]] — topic-tree plan format and optimize procedure
- [[skill-analyst-modes|Analyst Modes Skill]] — five analyst operating modes
- [[skill-curator-fixes|Curator Fixes Skill]] — curator diagnostic checks and fix catalog
- [[skill-voice|Voice Skill]] — house writing voice and register rules

## Obsidian Integration Skills

Skills for Obsidian-specific operations:

- [[skill-obsidian-vault|Obsidian Vault Skill]] — safe CLI scoping contract
- [[skill-obsidian-cli|Obsidian CLI Skill]] — Obsidian CLI command reference
- [[skill-obsidian-graph-colors|Obsidian Graph Colors Skill]] — apply per-topic color groups to the graph view
- [[skill-obsidian-markdown|Obsidian Markdown Skill]] — Obsidian-flavored markdown syntax reference

## Design Patterns

Cross-cutting patterns implemented across the skill library:

- [[single-responsibility-skill-pattern|Single-Responsibility Skill Pattern]] — each skill owns exactly one pipeline verb and refuses to do the adjacent verb
