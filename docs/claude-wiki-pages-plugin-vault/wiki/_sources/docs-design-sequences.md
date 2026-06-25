---
title: "Design — Sequences (L3)"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "design", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Design — Sequences (L3)

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

The sequences diagram document (`docs/design/03-sequences.md`) shows step-by-step flows for four key interactions: the SessionStart vault resolution flow, the ingest write-path through the PreToolUse hook cluster, the agent write-back flow with the human approval gate, and the durable-memory Stop/SessionEnd flow.

## Key Claims

Four mermaid sequence diagrams. (1) SessionStart: CC → `session-start.sh` → `resolve-vault.sh` → vault CLAUDE.md. (2) Ingest write-path: person/agent → ingest skill → engine → PreToolUse cluster (firewall, validate-frontmatter, check-wikilinks, protect-raw, validate-attachments) → vault → PostToolUse. (3) Agent write-back: agent drafts to `_proposed/`, firewall blocks direct wiki write, human reviewer promotes via review skill. (4) Durable memory: CC `Stop` → `session-memory.sh` → `raw/agent-sessions/` (ADR-0010 carve-out, lazy if scratch absent).

Covers: Sequence Diagrams, Ingest Write-Path, SessionStart Flow, Agent Write-Back, Durable Memory Flow
