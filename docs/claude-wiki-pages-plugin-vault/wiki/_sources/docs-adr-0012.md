---
title: "ADR-0012: Vault Merge Conflict Resolution"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-07
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0012: Vault Merge Conflict Resolution

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-07
- **URL:** —

## Summary

ADR-0012 defines the policy for resolving git merge conflicts in the vault. When a conflict occurs in `wiki/`, the curator agent inspects both sides and applies a deterministic merge strategy: for frontmatter fields, prefer the higher `update_count`; for body text, append both versions under a `## Conflict` heading for human resolution. `raw/` conflicts abort with an error — raw files are immutable and must not be merged.

## Key Claims

Status: Accepted. Merge strategy is deterministic for frontmatter (higher update_count wins) and conservative for body (both sides preserved, human resolves). The curator's `engine.sh heal` step checks for conflict markers and flags them. `raw/` merge conflicts are a fatal error — the user must resolve manually. The vault's git checkpoint model (one commit per ingest/heal) minimizes the conflict surface by keeping writes small and bounded.

Covers: Vault Merge Conflict, Merge Resolution, Curator Heal, Git Checkpoint
