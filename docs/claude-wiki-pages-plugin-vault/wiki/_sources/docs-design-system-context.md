---
title: "Design: System Context and Layers"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "design", "architecture"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Design: System Context and Layers

## Metadata

- File: `raw/repo/docs/design/01-system-context.md`
- Type: design documentation (Mermaid diagrams)

## Summary

Visual zoom-out of the system context and four layers. Two users: person (Obsidian/terminal) and agent (Claude/local LLM). Both reach the same surfaces through SOFTWARE-3-0.md dual entry point. Visualizes the four-layer decomposition without restating architecture.md.

## Key Claims

Two users: person (reads, runs /claude-wiki-pages:wiki) and agent (reads on-ramp, calls engine); contributor builds and reads design. The vault (raw/ + wiki/ + _proposed/) is the core data layer. External systems: Obsidian app (render + graph), git (history + provenance), Ollama/LM Studio (optional, local generation). Layer diagrams show: L4 Orchestration (hooks → scripts → engine Bun CLI), L3 Agents (orchestrator → specialists), L2 Skills (slash commands → capabilities), L1 Data (CLAUDE.md schema + raw/ + wiki/). Authority: architecture.md; design diagrams visualize it, do not restate it.

Covers: System Context, Four-Layer Diagram, Dual Entry Point, Layer Decomposition
