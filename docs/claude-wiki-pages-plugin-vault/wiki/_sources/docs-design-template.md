---
title: "Design Diagram Template"
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

# Design Diagram Template

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-01
- **URL:** —

## Summary

The `_template.md` file in `docs/design/` is the canonical template for all C4-style mermaid diagrams in the design directory. It defines the required front matter (zoom level, perspective, authority link) and the standard sections (Purpose, Diagram, Reading guide, See also).

## Key Claims

Template sections: zoom level (L0 Context / L1 Containers / L2 Components / L3 Sequences), perspective label, authority link (must link to the doc the diagram visualizes — `docs/architecture.md` by default). Conventions enforced: one mermaid fence per diagram, every node grounded in a real repo entity (or marked `[speculative]`), layer names in Title Case, no RAG/embeddings implied. The `[speculative]` marker exempts a doc from Check 5a (node grounding) of the design-drift gate.

Covers: Design Diagram Template, C4 Zoom Levels, Node Grounding Convention, Speculative Marker
