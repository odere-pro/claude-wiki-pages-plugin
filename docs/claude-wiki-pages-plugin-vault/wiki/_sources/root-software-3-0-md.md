---
title: "SOFTWARE-3-0 Dual Entry Point"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["root", "contributor", "agent-onramp"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# SOFTWARE-3-0 Dual Entry Point

## Metadata

- **File**: `raw/repo/root/SOFTWARE-3-0.md`
- **Scope**: Dev-time contributor and agent reference map
- **Type**: Dual entry point document (person + agent)

## Summary

A dual on-ramp document for human contributors and agent workers operating on the plugin repository. States the "one rule": every surface must be reachable and equally usable by both. Dev-time only — not copied to user vaults on install.

## Key Claims

One rule: links, never restates; every surface reachable by both person and agent. Person on-ramp: docs/getting-started.md + `/claude-wiki-pages:wiki`. Agent on-ramp: `skills/engine-api` + `skills/maintain-contract`. Six surfaces mapped with dual on-ramps: Docs, Tools, Design, System design, Context, Memory. Authoring path (same for both): typed template → `skills/draft` writes to `_proposed/` → `skills/review` gates promotion. Security: firewall.sh confines writes; `raw/` is immutable; structural provenance via `sources`/`source_quotes`/`derived`/`confidence`; no embeddings, no vector store.
Covers: Dual Entry Point, Agent On-Ramp, Contributor On-Ramp, SOFTWARE-3.0, Six Surfaces
