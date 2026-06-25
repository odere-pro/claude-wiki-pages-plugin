---
title: "LLM Wiki Guide 03 — Update an Existing Knowledge Base"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-01
date_ingested: 2026-06-25
tags: ["docs", "llm-wiki", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# LLM Wiki Guide 03 — Update an Existing Knowledge Base

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

Guide 03 covers adding new sources to an existing vault and triggering the ingest pipeline. It explains the raw/ drop workflow (drop a file into `vault/raw/`, then run `/claude-wiki-pages:wiki`), the entity-update model (ingest rewrites/extends multiple existing pages rather than creating one summary), and how to handle a wired project source via `wire-source.sh`.

## Key Claims

Drop workflow: copy a markdown/PDF/text file into `vault/raw/`, then call `/claude-wiki-pages:wiki`. The orchestrator probes the backlog and dispatches the ingest-agent. The entity-update model means one source produces changes across multiple existing pages (rather than a new summary page per source). The ingest pipeline: classify → draft → heal → polish → snapshot. For the host project's own docs, use `wire-source.sh add` (ADR-0024). The ingest always git-checkpoints before and after.

Covers: Raw Drop Workflow, Entity Update Model, Wire Source, Ingest Pipeline Trigger
