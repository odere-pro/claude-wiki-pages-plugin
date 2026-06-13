---
title: "Ingest Agent"
type: entity
entity_type: tool
aliases: ["Ingest Agent", "ingest agent", "claude-wiki-pages-ingest-agent", "pipeline"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[ADR-0002: Agent Naming Convention]]", "[[User Guide 03: Update Existing Vault]]", "[[Operations Guide]]"]
related: ["[[Orchestrator Agent]]", "[[Curator Agent]]", "[[Polish Agent]]", "[[Ingest Pipeline]]", "[[Git Checkpoint]]"]
tags: ["agent", "ingest"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Ingest Agent

## Overview

The `claude-wiki-pages-ingest-agent` processes raw sources from `vault/raw/` into structured wiki pages. It chains: ingest → (optional optimize) → synthesize. The `SubagentStop` gate automatically runs `verify-ingest.sh` after the agent returns.

## Key Facts

- **Slug:** `claude-wiki-pages-ingest-agent` (renamed from `llm-wiki-ingest-pipeline` in 0.2.0).
- **Dispatch condition:** Files in `raw/` whose filenames do not appear in any `wiki/log.md` ingest entry.
- **Write-path:** snapshot pre → source summaries → entity/concept pages → folder notes → index/log updates → snapshot post.
- **Follows 13-step ingest rules** in `vault/CLAUDE.md` (not the skill's simpler defaults).
- **Entity distribution model:** one source rewrites many existing pages (DRY) — updating rather than creating duplicates.
- **Direct invocation:** `/claude-wiki-pages:claude-wiki-pages-ingest-agent` skips the orchestrator state probe.

## Related

- [[Orchestrator Agent]] — dispatches to this agent when pending sources exist
- [[Curator Agent]] — runs after ingest (or is dispatched for lint-fix separately)
- [[Polish Agent]] — runs as tail step after ingest completes
- [[Ingest Pipeline]] — the conceptual workflow this agent implements
- [[Git Checkpoint]] — snapshot pre/post wraps the write phase
