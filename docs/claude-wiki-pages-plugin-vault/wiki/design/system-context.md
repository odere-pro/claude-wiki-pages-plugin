---
title: "System Context"
type: concept
aliases: ["System Context", "system context", "L0 L1 diagrams"]
parent: "[[Design]]"
path: "design"
sources: ["[[01-system-context]]"]
related: ["[[Four-Layer Stack]]", "[[Component Design]]"]
tags: [design, architecture]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# System Context

The system context shows who uses `claude-wiki-pages`, what external systems it touches, and the high-level structure of the four-layer stack.

## L0 — System Context

The system has two co-equal first-class users: a **person** (in Obsidian or a terminal) and an **agent** (Claude, or a local model). Both reach the same surfaces through the `SOFTWARE-3-0.md` dual entry point.

**Key invariant:** the agent and the person enter the same system through the same surfaces. There is no agent-only side door. External systems are thin — Obsidian renders, git records, Ollama (optional) only generates text; none of them does retrieval (no embeddings).

External systems:
- **Obsidian app** — renders wiki pages and shows the graph view
- **git** — records history and provenance; every structural write commits
- **Ollama / LM Studio** — optional local generation; no RAG, no vector store

## L1 — The Four-Layer Stack

The system is four layers plus a deterministic engine and a passive vault:

- **Layer 4 — Orchestration**: `commands/` (wiki, onboarding, doctor), `hooks/hooks.json` (7 events), `scripts/` (~30 bash scripts), `rules/` (path-scoped rules)
- **Layer 3 — Agents**: `agents/` (7 orchestrated executors)
- **Layer 2 — Skills**: 12 action skills + 5 agent-teaching skills
- **Layer 1 — Data**: `raw/`, `wiki/`, `CLAUDE.md` (vault schema)
- **Engine**: Bun CLI (`src/`) — deterministic validation; no inference

The engine is not a layer — it is a tool that Layer 4 calls. It validates the vault and runs quality checks deterministically, using the same input→same output guarantee for every operation.

See [[Four-Layer Stack]] for the authoritative layer description.
