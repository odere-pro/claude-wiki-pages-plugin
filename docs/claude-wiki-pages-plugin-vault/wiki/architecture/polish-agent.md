---
title: "Polish Agent"
type: entity
entity_type: tool
aliases: ["Polish Agent", "polish agent", "claude-wiki-pages-polish-agent", "polish"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[ADR-0003: Polish Agent and Obsidian-Side Experience]]", "[[ADR-0022: Folder Notes and Graph Quality]]", "[[ADR-0023: Wiki-Only Graph]]", "[[User Guide: Obsidian Experience]]"]
related: ["[[Orchestrator Agent]]", "[[Ingest Agent]]", "[[Curator Agent]]", "[[Folder Note]]", "[[Wiki-Only Graph]]", "[[Obsidian Experience]]"]
tags: ["agent", "polish"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# Polish Agent

> [!summary]
> The `claude-wiki-pages-polish-agent` is the tail-of-write step that keeps the Obsidian-side experience consistent after every ingest or curator pass. It owns three idempotent steps: graph color application, `wiki/index.md` regeneration, and folder note reconciliation. It is not user-invocable directly — the [[Orchestrator Agent]] fans it out after ingest or curator success. It was introduced in ADR-0003 to centralise the Obsidian-side invariants, which were previously distributed across the ingest agent, the curator, and the standalone `llm-wiki-index` skill.

## Overview

The polish agent (new in 0.2.0, ADR-0003) exists because the "vault stays in sync with Obsidian" guarantee was previously fragile: the ingest agent handled graph colors at step 1.7, the curator repaired MOC consistency intermittently, and the standalone index skill rebuilt `wiki/index.md` from scratch. Running these three in different orders produced disagreements — page counts off by one, topic colors missing after curator-only runs, no single test that could assert the post-write Obsidian state.

Centralising the work in a single agent solves all three. One place owns the Obsidian-side invariants. New contributors who need to fix a graph-color bug or an index-drift bug have a single file to read.

## Not User-Invocable

The polish agent is `user-invocable: false`. It has no standalone meaning — it only makes sense as the tail of a write-phase agent. The orchestrator fans it out automatically. If you run a specialist directly (bypassing the orchestrator), you can manually trigger polish:

```
/claude-wiki-pages:claude-wiki-pages-polish-agent
```

Use this when you have run the ingest or curator agent directly and need Obsidian sync.

## Three Idempotent Steps

All three steps are idempotent: running polish on a vault where no changes occurred since the last polish produces no new commits and no diff.

### Step 1 — Graph Colors

For every top-level topic folder in `wiki/`, the agent checks whether a color group exists in `.obsidian/graph.json` for that folder. The canonical group order (ADR-0023, first match wins):

1. One `path:wiki/<topic>` query per topic folder, each assigned a unique color.
2. `_sources` → gray.
3. `_synthesis` → yellow.

New folders added by the ingest or curator pass get new color entries. Existing folders are skipped (idempotent). The agent calls the `obsidian-graph-colors` skill, which in turn calls `obsidian eval` if the CLI is available.

**Headless fallback (ADR-0003):** when the Obsidian CLI is unavailable, the agent writes `.obsidian/graph.json` directly (merging into the existing file, touching only `colorGroups` and `collapse-color-groups`). The trade-off: a running Obsidian may overwrite a direct file write with its in-memory state. After a headless write, restart Obsidian.

### Step 2 — Index Refresh

Regenerates `wiki/index.md` from the per-folder folder notes. For each topic folder:
- Lists all `wiki/<topic>/*.md` pages (excluding the folder note itself and sub-folder notes).
- Updates the folder note's `children` count annotation.
- Rebuilds the master index entry for the topic.

This replaces the ingest agent's previous append-only `wiki/index.md` step, which could leave page counts one or two pages off after a sequence of ingest + restructure runs.

### Step 3 — Folder Note Reconciliation

Walks every folder under `wiki/`. For each folder, compares the actual `.md` siblings to the folder note's `children` list. Any page present on disk but absent from `children` is appended. This is **append-only** — the agent never removes entries from `children`, even if a page file is missing (removals require editorial judgment, which is the [[Curator Agent]]'s domain).

The reconciliation also checks `child_indexes`: any subfolder that has a folder note but is not listed in the parent's `child_indexes` gets added.

## `userIgnoreFilters` Assertion

After every ingest, the polish agent also asserts that `.obsidian/app.json` contains `userIgnoreFilters: ["raw/", "_templates/", "_proposed/"]`. This merge-only operation appends any missing entries; it never removes user-added entries. The purpose is to keep the wiki-only graph invariant (ADR-0023): `raw/`, `_templates/`, and `_proposed/` are excluded from Obsidian's index so they never appear in the graph, search, or link autocomplete.

## Failure Isolation

ADR-0003 specifies that a polish failure must not block a successful ingest result. The orchestrator fans out polish "in parallel with the final-report compose step" — the user sees the ingest/curator result immediately, and a polish failure appears as a warning rather than blocking the session. This prevents a graph-color API hiccup from making an ingest look failed.

## Relationship to Other Agents

The polish agent was added as a fourth specialist in 0.2.0, growing `agents/` from 3 to 4 files. The four roles now map cleanly to the four user-visible workflow phases:

| Phase | Specialist |
| --- | --- |
| Init | Onboarding wizard |
| Ingest | [[Ingest Agent]] |
| Repair | [[Curator Agent]] |
| Presentation | Polish Agent |

The polish agent's three steps are collectively "presentation" — they do not change wiki content, they sync how Obsidian renders it.

## Related

- [[Orchestrator Agent]] — fans out the polish agent as a tail step
- [[Ingest Agent]] — triggers a polish run on every successful ingest
- [[Curator Agent]] — triggers a polish run after every audit-and-repair pass
- [[Folder Note]] — the per-folder index files the agent reconciles
- [[Wiki-Only Graph]] — the graph contract the polish agent enforces via `userIgnoreFilters`
- [[Obsidian Experience]] — the user-facing outcome the polish agent maintains
