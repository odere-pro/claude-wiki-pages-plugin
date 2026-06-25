---
title: "fill-gaps command (/claude-wiki-pages:fill-gaps)"
type: source
source_type: manual
source_format: text
attachment_path: ""
extracted_at: 2026-06-25
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["commands", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# fill-gaps command (/claude-wiki-pages:fill-gaps)

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/commands/fill-gaps.md

## Summary

Slash command definition for the gap-fill operation. Invokes the fill-gaps skill which runs eight sequential, git-checkpointed phases: stage curated repo sources → ingest by topic → author topic hub pages → resolve dangling links → enrich thin pages → heal + polish → measure. Target outcome is zero dangling wikilinks and a graph clustered around core topics.

## Key Claims

- Goal: zero dangling [[links]], no empty pages, graph clustered around core topic clusters.
- Materializes fill-knowledge-gaps.mjs workflow into .claude/workflows/ (idempotent, never clobbers a user-modified copy).
- Eight git-checkpointed phases; every phase is reversible with git revert.
- Gated like ingest — never auto-fires; it writes to the vault.
- Allowed tools: Bash(bash *), Read, Glob, Grep.
- ADR: ADR-0027.

Covers: fill-gaps command, Dangling Links, Graph Quality, Knowledge Gaps, Gap Fill Workflow
