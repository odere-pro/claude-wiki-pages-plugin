---
title: "Polish Agent"
type: entity
entity_type: tool
aliases: ["Polish Agent", "polish agent", "claude-wiki-pages-polish-agent"]
parent: "[[Agent Roles]]"
path: "agents"
sources: ["[[architecture]]", "[[ADR-0003 Polish Agent]]"]
related: ["[[Orchestrator Agent]]", "[[Curator Agent]]"]
tags: [agent, polish, obsidian]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Polish Agent

**`claude-wiki-pages-polish-agent`** — Obsidian-side experience consistency.

## Responsibilities (Three Idempotent Steps)

1. **Graph colors** — apply Obsidian graph-view color group definitions for any new top-level topic folders. Each cluster gets a consistent color.
2. **Vault MOC** — regenerate `wiki/index.md` from all per-folder `_index.md` files, including current page counts per cluster.
3. **`_index.md` reconciliation** — for every `_index.md`, synchronize the `children:` list with the actual filesystem siblings. Append-only: pages are added to the list when they appear on disk; no entries are deleted (deletions require curator or human action).

## Invocation

Invoked by the [[Orchestrator Agent]] after ingest or curator returns successfully. Not user-invocable directly (ADR-0003: the polish agent centralizes Obsidian-side experience; invoking it directly bypasses the sequencing guarantee).

## Why a Dedicated Agent

The polish agent was split from the curator because polish operations (graph colors, MOC sync) are Obsidian-visible UX tasks, not structural correctness tasks. Keeping them separate allows the curator to run fast structural repairs without touching Obsidian config files. ADR-0003 documents this split.
