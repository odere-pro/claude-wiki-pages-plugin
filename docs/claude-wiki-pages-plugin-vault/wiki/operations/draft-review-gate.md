---
title: "Draft Review Gate"
type: concept
aliases: ["Draft Review Gate", "draft review gate", "proposed gate", "_proposed/ gate"]
parent: "[[Operations Guide]]"
path: "operations"
sources: ["[[operations]]", "[[ADR-0010 Durable Memory Carve-Out]]"]
related: ["[[Curator Agent]]", "[[Hook System]]", "[[Operations Guide]]"]
tags: [operations, review, gate, proposed]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Draft Review Gate

The `wiki/_proposed/` directory is the one channel for content that requires human review before entering the wiki.

## What Goes Through `_proposed/`

- **Curator judgment repairs** — structural issues that cannot be resolved unambiguously (e.g., two near-duplicate pages that might be merged).
- **Agent session learnings** — durable memory from `Stop`/`SessionEnd` hooks (ADR-0010). Agents write `raw/agent-sessions/<date>-<topic>.md` files; these enter the wiki only after the curator proposes a `wiki/_proposed/` note and the human accepts.
- **Draft skill output** — pages written with the `draft` skill land in `_proposed/` rather than the live wiki.

## What Does Not Go Through `_proposed/`

- Ingest output (goes directly to `wiki/<cluster>/`).
- Self-heal curator repairs (applied automatically).
- Polish operations (graph colors, MOC updates, `_index.md` sync).

## Review Workflow

1. Curator (or `draft` skill) writes a file to `wiki/_proposed/`.
2. User runs `/claude-wiki-pages:wiki` → orchestrator detects `_proposed/` content → dispatch to curator review mode.
3. Or: user runs the `review` skill directly.
4. For each `_proposed/` item: **accept** (curator applies it to the live wiki) or **reject** (item is deleted from `_proposed/`).

## Why This Gate Exists

The gate is the boundary between deterministic self-heal and judgment calls. Without it, the curator would either refuse to act on ambiguous issues or silently apply changes that change the wiki's semantic meaning without human awareness. The gate keeps the autonomous path safe.
