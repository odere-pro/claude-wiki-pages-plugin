---
title: "ADR-0002: Agent Naming Convention"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "naming", "agents"]
aliases: ["ADR-0002: Agent Naming Convention"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0002: Agent Naming Convention

## Summary

Establishes the `{plugin-name}-{role}-agent` naming pattern for all plugin agents. The `-agent` suffix is mandatory to disambiguate agents from skills at first read. `curator` is preferred over `lint-fix` as the role name.

## Key Claims

- Agent naming: `claude-wiki-pages-{role}-agent` (e.g. `claude-wiki-pages-curator-agent`).
- The `-agent` suffix is mandatory.
- Skills use single verbs (`ingest`, `query`, `lint`); agents use the full prefixed form.
- Plugin prefix matches the plugin id exactly (not `llm-wiki-` substring) so search-and-replace is unambiguous.
- `curator` was chosen over `lint-fix` as the role name because it better conveys editorial judgment.

## Entities Mentioned

- [[Curator Agent]]
- [[claude-wiki-pages Plugin]]

## Concepts Covered

- Agent Naming Convention (`claude-wiki-pages-{role}-agent` pattern)
- Skill Naming Convention (single verbs: `ingest`, `query`, `lint`)

## Grounded Pages

Wiki pages that cite this source:

- [[Orchestrator Agent]] — naming convention applied
- [[Ingest Agent]] — renamed from llm-wiki-ingest-pipeline in 0.2.0
- [[Curator Agent]] — renamed from llm-wiki-lint-fix in 0.2.0
