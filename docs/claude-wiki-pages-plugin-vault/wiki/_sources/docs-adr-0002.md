---
title: "ADR-0002: Agent Naming Convention"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-02
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0002: Agent Naming Convention

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-05-02
- **URL:** —

## Summary

ADR-0002 establishes the canonical naming convention for all Layer 3 and Layer 4 agents: `{plugin-name}-{role}-agent`. The ADR was motivated by two problems: there was no way to tell a skill from an agent by name alone, and the orchestrator (added in ADR-0001) introduced a second naming convention into the same directory.

## Key Claims

Status: Accepted. The convention `{plugin-name}-{role}-agent` applies to all agents; skills keep their short verb names. The plugin was renamed from `llm-wiki-stack` to `claude-wiki-pages` after this ADR, so worked examples in the ADR retain the retired id. Consequences: a slash command like `/claude-wiki-pages:wiki` always calls the orchestrator; specialists like `claude-wiki-pages-ingest-agent` are unambiguously agents. The vocabulary gate (`validate-docs.sh`) enforces the convention.

Covers: Agent Naming Convention, Plugin Naming, Layer 3 Agents, Vocabulary Gate
