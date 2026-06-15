---
title: "Graph Coloring"
type: concept
aliases: ["Graph Coloring", "graph coloring", "color groups", "graph color groups", "Obsidian graph colors"]
parent: "[[Obsidian]]"
path: "obsidian"
sources: ["[[ADR-0022: Folder Notes and Graph Quality]]", "[[ADR-0023: Wiki-Only Graph]]", "[[ADR-0003: Polish Agent and Obsidian-Side Experience]]", "[[User Guide: Obsidian Experience]]"]
related: ["[[Wiki-Only Graph]]", "[[Graph Config Cache]]", "[[Polish Agent]]", "[[Folder Note]]", "[[Obsidian Experience]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "graph", "obsidian"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Graph Coloring

> [!summary]
> Graph coloring is the Obsidian graph plugin's color-group system applied to the claude-wiki-pages wiki. Each top-level topic folder gets a unique color; two special folders (`_sources` gray, `_synthesis` yellow) get fixed colors. Color groups are regenerable cache: every value derives from the `wiki/` topic tree and is rebuilt by running `/claude-wiki-pages:obsidian-graph-colors` or the polish agent.

## Key Principles

- Color groups are regenerable cache: every value derives deterministically from the `wiki/` topic tree plus the palette table — no manual maintenance required.
- The canonical color-group order is topics → specials; the layer pass (raw/wiki/templates groups) was dropped in ADR-0023 because `raw/` and `_templates/` are excluded from the Obsidian index.
- `path:wiki/<topic>` queries give folder notes their topic color automatically — no separate folder-note color group is needed.
- The polish agent adds groups for new topic folders idempotently; it never removes user-added groups.
- The headless fallback (direct file write) works in CI environments but is vulnerable to Obsidian clobbering on next save; restart Obsidian to confirm the groups loaded.

## Examples

Color-group entry in `.obsidian/graph.json`:

```json
{
  "colorGroups": [
    { "query": "path:wiki/engine", "color": { "r": 0.3, "g": 0.6, "b": 1.0 } },
    { "query": "path:wiki/llm",    "color": { "r": 0.9, "g": 0.5, "b": 0.1 } },
    { "query": "path:wiki/_sources", "color": { "r": 0.6, "g": 0.6, "b": 0.6 } },
    { "query": "path:wiki/_synthesis", "color": { "r": 0.9, "g": 0.9, "b": 0.1 } }
  ]
}
```

Rebuilding from scratch after `.obsidian/graph.json` is lost:

```bash
/claude-wiki-pages:obsidian-graph-colors
```

## Definition

Obsidian's built-in graph plugin supports "color groups" — named queries that assign a color to all matching nodes. The plugin uses this to visually distinguish topic clusters in the graph view. Each `wiki/<topic>/` folder gets one color group with query `path:wiki/<topic>`, so all pages in that cluster share the same color.

The canonical group order (first match wins, evaluated top-down):

1. **Topics** — one `path:wiki/<topic>` query per top-level topic folder. Each topic gets a distinct color from the plugin's palette table.
2. **Specials** — `_sources` gray, `_synthesis` yellow.

There is no catch-all layer-pass group for `path:raw`, `path:wiki`, or `path:_templates`. Those paths are excluded from Obsidian's index entirely via `userIgnoreFilters`, so a color group for them would never match.

## How Colors Are Applied

**Primary path: `obsidian eval`.** The `/claude-wiki-pages:obsidian-graph-colors` skill uses `obsidian eval` to call Obsidian's internal graph plugin API directly. This is the preferred path because it works with a running Obsidian instance and avoids the file-clobber race.

**Headless fallback: direct file write.** When `obsidian eval` is unavailable (no CLI, no running Obsidian), the skill writes `.obsidian/graph.json` directly, touching only the `colorGroups` and `collapse-color-groups` keys. Trade-off: a running Obsidian can clobber a direct file write with its in-memory state. Restart Obsidian after a headless write to confirm the groups loaded.

**Polish agent: idempotent assertion.** The `claude-wiki-pages-polish-agent` runs after every ingest and checks for missing color groups. It adds groups for any new top-level topic folders. It never removes user-added groups; it only adds missing plugin-managed ones.

## Regenerable Cache

`.obsidian/graph.json` and the plugin-owned `app.json` keys are **cache, not state**. The entire `.obsidian/` directory is gitignored. Every value in the graph config derives deterministically from the `wiki/` topic tree plus the skill's palette table. If `.obsidian/graph.json` is lost or corrupted:

```bash
/claude-wiki-pages:obsidian-graph-colors
```

This rebuilds the scaffold, topic groups, specials, and `userIgnoreFilters` from scratch. The reconstruction is deterministic: the same topic tree always produces the same color assignment.

## What Changed in ADR-0023

ADR-0022 introduced the `file:_index` catch-all group to make folder notes inherit their topic's color. ADR-0023 dropped this approach: folder notes now inherit their topic's color through the `path:wiki/<topic>` query because they live inside that topic folder. The `file:_index` group was dead weight that no longer matched (folder notes are now named `<topic>.md`, not `_index.md`).

ADR-0023 also dropped the "layer pass" — three groups for `path:raw`, `path:wiki`, and `path:_templates`. With `raw/` and `_templates/` excluded from Obsidian's index via `userIgnoreFilters`, these groups would never match.

## Related Concepts

- [[Wiki-Only Graph]] — the exclusion contract that determines what appears in the graph
- [[Graph Config Cache]] — why `.obsidian/` is gitignored and fully regenerable
- [[Polish Agent]] — the agent that asserts color groups idempotently after every write
- [[Folder Note]] — the per-topic index pages that drive the `path:wiki/<topic>` color groups
- [[Obsidian Experience]] — the broader Obsidian-side user experience
