---
title: "ADR-0030: Obsidian-Accurate Link Resolution and Collision"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-15
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0030: Obsidian-Accurate Link Resolution and Collision

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-15
- **URL:** —

## Summary

ADR-0030 tightens the link-resolution model to match Obsidian's actual priority: exact vault path > file basename (case-insensitive) > alias (case-insensitive). It adds a `wikilink-collision` WARN check for cases where a link target matches both a basename and an alias on different pages (Obsidian silently routes to the basename). A single resolver replaces the flat resolvable set from ADR-0028.

## Key Claims

Status: Proposed. The two silent failure classes ADR-0028's flat set cannot detect: (1) a link that resolves to the wrong page because a real basename beats an alias; (2) a collision where the same string is both a basename and an alias on different pages. The new resolver assigns priorities (path > basename > alias) and produces a `wikilink-collision` WARN when a basename/alias collision is detected. The bash twin in `scripts/` must stay in parity (gate-05).

Covers: Obsidian-Accurate Link Resolution, Wikilink Collision, Basename vs Alias Priority, Resolution Model
