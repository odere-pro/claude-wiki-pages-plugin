---
title: "Design Directory README"
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

# Design Directory README

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

The `docs/design/README.md` is the entry point for the design diagram suite. It explains the C4-style zoom convention (L0 Context → L1 Containers → L2 Components → L3 Sequences), lists the seven diagram perspectives, and documents the conventions (one fence per diagram, grounded nodes, Title Case layer names, no RAG). It also tracks the design-drift gate status.

## Key Claims

Seven diagram files in `docs/design/`: 01-system-context (L0+L1), 02-component-design (L2 + patterns), 03-sequences (L3), 04-teams-and-agents, 05-claude-config-security, 06-feature-relations, 07-ontology. Start with 01 for the whole system on one screen. The design-drift gate (Check 5 of validate-docs.sh, ADR-0013) is live — "Ground every node" is enforced, not just a convention. The deeper L3 sequences for the maintenance loop and firewall decision tree are backlog items tracked in `tmp/`.

Covers: Design Diagram Suite, C4 Zoom Levels, Design Drift Gate, Diagram Conventions
