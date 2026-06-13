---
title: "Curator Agent"
type: entity
entity_type: tool
aliases: ["Curator Agent", "curator agent", "claude-wiki-pages-curator-agent", "curator"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[ADR-0002: Agent Naming Convention]]", "[[User Guide 04: Review, Validate, Fix]]", "[[Operations Guide]]"]
related: ["[[Orchestrator Agent]]", "[[Polish Agent]]", "[[Ingest Agent]]", "[[Lint Rules]]", "[[Auto-Heal]]", "[[Git Checkpoint]]"]
tags: ["agent", "curator"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Curator Agent

## Overview

The `claude-wiki-pages-curator-agent` audits the wiki for structural and provenance drift, then auto-heals mechanical issues without approval. Judgment fixes (restructures, merges) require a plan. Self-heal is git-controlled: a checkpoint commit precedes every change.

## Key Facts

- **Slug:** `claude-wiki-pages-curator-agent` (renamed from `llm-wiki-lint-fix` in 0.2.0).
- **Dispatch condition:** Previous ingest not followed by lint, or direct invocation.
- **Auto-heals without approval:** broken wikilinks, missing frontmatter, orphan pages, index drift, plain-string sources, missing parent/path.
- **Requires plan:** restructures, merges, folder reorganizations.
- **Retry cap:** at most two lint-fix sub-agent runs per pipeline (initial + one re-run).
- **Engine integration:** `engine.sh heal` runs first (deterministic fixes), then judgment fixes.
- **Direct invocation:** `/claude-wiki-pages:claude-wiki-pages-curator-agent` for audit-and-repair without an ingest beforehand.

## Related

- [[Orchestrator Agent]] — dispatches to this agent after ingest or when lint is overdue
- [[Polish Agent]] — tail-of-write step after curator completes
- [[Lint Rules]] — the checks the curator performs
- [[Auto-Heal]] — the mechanical fixes applied automatically
- [[Git Checkpoint]] — every change lands in a reversible commit
