---
title: "scripts/apply-obsidian-config.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/apply-obsidian-config.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/apply-obsidian-config.sh

## Summary

Deterministic, idempotent writer for a vault's `.obsidian/graph.json` and `.obsidian/app.json`. Applies the topic-island graph filter, wiki-only exclusions, and per-topic color groups on every run via merge-only semantics. Thin wrapper over `scripts/apply-obsidian-config.ts`. Implements ADR-0035.

## Key Claims

Fixes the prior polish-agent approach that only wrote graph.json when absent — so once Obsidian created graph.json with harmful defaults (empty search, hideUnresolved: false, showTags: true), the filters never landed and raw/ and _sources/ leaked into the graph. Now asserts the filters on every run. Fail-open: missing Bun or wiki/ is a skip. Supports --check mode (exit 3 on drift).

Covers: Obsidian Graph Config, Deterministic Config Writer, ADR-0035, Topic Island Graph
