---
title: "Design README"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "diagrams", "c4"]
aliases: ["Design README"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design README

## Summary

Introduces the design diagram directory (`docs/design/`). Uses C4-style zoom levels (L0 Context → L1 Containers → L2 Components → L3 Sequences). Conventions: one fence per diagram, ground every node, Title Case for layer names, no RAG/embeddings.

## Key Claims

- C4 zoom levels: L0 (context — who uses it), L1 (containers — four-layer stack), L2 (components — skills/agents/hooks wired), L3 (sequences — step-by-step flows).
- Seven diagram files: 01 through 07.
- Diagrams are committed mermaid markdown: versioned, diffable, gate-checked.
- The design-drift gate (ADR-0013) enforces node grounding.
- `[speculative]` marker exempts unresolved nodes from grounding check.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Design-Drift Gate]]
- [[Node Grounding]]
- [[Four-Layer Stack]]

## Grounded Pages

Wiki pages that cite this source:

- [[Design Diagrams]] — conventions and zoom levels
