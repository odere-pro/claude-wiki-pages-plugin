---
title: "Four-Layer Stack"
type: concept
aliases: ["Four-Layer Stack", "four-layer stack", "four layer stack"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[architecture]]"]
related: ["[[Data Layer]]", "[[Skills Layer]]", "[[Agents Layer]]", "[[Orchestration Layer]]"]
tags: [architecture, core-concept]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Four-Layer Stack

> [!summary]
> `claude-wiki-pages` is a four-layer implementation of Karpathy's LLM Wiki pattern. Each layer has a distinct responsibility and a distinct failure mode. Understanding the stack is the foundation for understanding every other aspect of the plugin.

`claude-wiki-pages` implements [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) as a Claude Code plugin with four explicitly separated layers. Most LLM-wiki implementations are one layer — a prompt and a folder convention. This one is four, because each layer has a different failure mode and deserves a different tool.

## The Layers

| Layer | Responsibility | What lives here |
| --- | --- | --- |
| **Layer 1 — Data** | Immutable sources + wiki schema | `raw/`, `wiki/`, `CLAUDE.md` |
| **Layer 2 — Skills** | Individual capabilities invoked by the human or an agent | `skills/` (24 skills) |
| **Layer 3 — Agents** | Multi-step executors that orchestrate skills | `agents/` (7 agents) |
| **Layer 4 — Orchestration** | Hooks, rules, provenance guards | `hooks/hooks.json`, `scripts/`, `rules/` |

## Why Four Layers

Each layer fails differently, and each failure is observable only at one place in the stack:

- **Data corruption** looks like a missing `sources` field or an orphan page. Caught by Layer 4 validation scripts.
- **A skill misbehaving** looks like bad output for one command. Caught by the human re-running with different input.
- **An agent misbehaving** looks like a half-written wiki after a long run. Caught by Layer 4's `SubagentStop` gates.
- **Orchestration misbehaving** looks like hooks not firing. Caught by startup reminders and the health check.

The layering is not academic — each gate exists in the only place the failure can be observed.

## Key Principle

Skills are single-responsibility and do not know about each other. Agents chain skills and own sequencing, retries, and quality gates. Orchestration enforces the schema at every tool call. Data is passive — it holds the material. This separation makes each component independently testable.

See [[Data Layer]], [[Skills Layer]], [[Agents Layer]], and [[Orchestration Layer]] for detail on each.
