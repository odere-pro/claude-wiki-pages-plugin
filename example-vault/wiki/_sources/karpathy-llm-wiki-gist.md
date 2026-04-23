---
title: "Karpathy LLM Wiki Gist"
type: source
source_type: article
source_format: text
url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
author: "Andrej Karpathy"
publisher: "GitHub Gist"
date_published: 2026-02-01
date_ingested: 2026-04-18
aliases: ["Karpathy LLM Wiki Gist", "Karpathy Gist", "LLM Wiki gist"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---

# Karpathy LLM Wiki Gist

## Metadata

- **Author:** Andrej Karpathy
- **Publisher:** GitHub Gist
- **Published:** 2026-02-01
- **URL:** https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## Summary

Karpathy's pattern for LLM-maintained personal wikis. Human curates sources in `raw/`; LLM derives a structured `wiki/` folder organized by topic. The pattern rests on two invariants — provenance is structural (every wiki page cites a source) and the wiki is derived rather than authoritative (contradictions are recorded as typed relationships, not silent overwrites).

## Key Claims

- Sources in `raw/` are immutable.
- Wiki pages are organized by topic, not by source.
- Every wiki page must cite at least one source.
- Contradictions between sources are recorded as typed relationships; the human resolves them.

## Entities Mentioned

- [[Claude Code]]

## Concepts Covered

- [[LLM Wiki Pattern]]
- [[Hook-Enforced Guarantees]]
