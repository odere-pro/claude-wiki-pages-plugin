---
title: "Four-Layer Stack"
type: concept
aliases: ["Four-Layer Stack", "four-layer stack", "four-layer architecture"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture]]", "[[Glossary]]", "[[Features]]"]
related: ["[[Layer 1 — Data]]", "[[Layer 2 — Skills]]", "[[Layer 3 — Agents]]", "[[Layer 4 — Orchestration]]", "[[claude-wiki-pages]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [architecture, core-concept]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Four-Layer Stack

> [!summary]
> The four-layer stack is the architectural foundation of `claude-wiki-pages`. Each layer has a distinct responsibility and failure mode. The layering is not academic — each gate is in the only place the failure can be observed.

`claude-wiki-pages` implements [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) as a four-layer stack packaged as a Claude Code plugin. Most LLM-wiki implementations are one layer (a prompt and a folder convention); this one is four because each layer fails differently.

## The Four Layers

| Layer | Responsibility | What lives here |
|---|---|---|
| [[Layer 1 — Data]] | Immutable sources + wiki schema | `raw/`, `wiki/`, `CLAUDE.md` |
| [[Layer 2 — Skills]] | Individual capabilities | `skills/` (23 skills) |
| [[Layer 3 — Agents]] | Multi-step executors | `agents/` (7 agents) |
| [[Layer 4 — Orchestration]] | Hooks, rules, provenance guards | `hooks/`, `scripts/`, `rules/` |

## Why Four Layers

Each layer fails differently:

- **Data corruption** looks like a missing `sources` field or an orphan page. Caught by Layer 4 (`validate-frontmatter.sh`, lint).
- **A skill misbehaving** looks like bad output for one command. Caught by the human re-running with different input.
- **An agent misbehaving** looks like a half-written wiki after a long run. Caught by Layer 4's `SubagentStop` gates.
- **Orchestration misbehaving** looks like hooks not firing. Caught by startup reminders and the health check.

## Glossary Entry

The Glossary defines `four-layer stack` as: "The architecture. Four layers, each catching a different class of failure."
