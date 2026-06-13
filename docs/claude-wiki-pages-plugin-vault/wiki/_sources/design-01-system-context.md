---
title: "Design: System Context"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["design", "architecture", "diagrams"]
aliases: ["Design: System Context"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Design: System Context

## Summary

L0 and L1 mermaid diagrams showing the whole system. L0 shows who uses the system and what it touches (human user + Claude Code + vault). L1 shows the four-layer stack as containers: vault, skills, agents, orchestration.

## Key Claims

- L0 context: Human → Claude Code → claude-wiki-pages plugin → vault (raw + wiki).
- L1 layers: Data (vault) / Skills (24) / Agents (7) / Orchestration (hooks/scripts).
- The entry verb `/claude-wiki-pages:wiki` is the sole user-facing door.
- The deterministic engine (Bun CLI) sits inside Layer 4 as a validation peer to the hooks.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]
- [[Orchestrator Agent]]
- [[Deterministic Engine]]

## Concepts Covered

- [[Four-Layer Stack]]
- [[Dual Entry Point]]

## Grounded Pages

Wiki pages that cite this source:

- [[Design Diagrams]] — L0/L1 system context perspective
- [[Four-Layer Stack]] — system context visual
