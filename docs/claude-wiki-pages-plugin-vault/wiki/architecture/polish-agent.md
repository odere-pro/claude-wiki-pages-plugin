---
title: "Polish Agent"
type: entity
entity_type: tool
aliases: ["Polish Agent", "polish agent", "claude-wiki-pages-polish-agent", "polish"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[ADR-0003: Polish Agent and Obsidian-Side]]", "[[ADR-0022: Folder Notes and Graph Quality]]", "[[ADR-0023: Wiki-Only Graph]]", "[[User Guide: Obsidian Experience]]"]
related: ["[[Orchestrator Agent]]", "[[Ingest Agent]]", "[[Curator Agent]]", "[[Graph Coloring]]", "[[Wiki-Only Graph]]", "[[Folder Note]]"]
tags: ["agent", "polish"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Polish Agent

## Overview

The `claude-wiki-pages-polish-agent` is the tail-of-write step that keeps the Obsidian-side experience in sync after every ingest or curator pass. It owns three idempotent steps and runs automatically — not user-invocable directly.

## Key Facts

- **Slug:** `claude-wiki-pages-polish-agent` (new in 0.2.0).
- **Trigger:** Runs automatically after every successful ingest or curator pass. Not user-invocable.
- **Three idempotent steps:**
  1. Apply graph colors for any new top-level topic folders (topics → specials order per ADR-0023).
  2. Regenerate `wiki/index.md` from per-folder folder notes with current page counts.
  3. Reconcile every folder note's `children`/`child_indexes` against actual filesystem siblings (append-only, never delete).
- **Headless fallback:** When Obsidian CLI is unavailable, writes `.obsidian/graph.json` directly. Restart Obsidian after a headless write.
- **`userIgnoreFilters`:** Asserts `["raw/", "_templates/", "_proposed/"]` in `.obsidian/app.json` idempotently after every ingest (merge-only: append missing entries, never remove user entries).

## Related

- [[Orchestrator Agent]] — invokes the polish agent as a tail step
- [[Graph Coloring]] — the graph color step the polish agent owns
- [[Wiki-Only Graph]] — the graph contract the polish agent enforces
- [[Folder Note]] — folder notes the polish agent keeps consistent
- [[Vault MOC]] — `wiki/index.md` the polish agent regenerates
