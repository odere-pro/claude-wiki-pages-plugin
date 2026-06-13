---
title: "Graph Config Cache"
type: concept
aliases: ["Graph Config Cache", "graph config cache", "regenerable cache", ".obsidian/ cache", "graph.json cache"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0023: Wiki-Only Graph]]", "[[User Guide: Obsidian Experience]]"]
related: ["[[Wiki-Only Graph]]", "[[Graph Coloring]]", "[[Polish Agent]]", "[[Folder Note]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "graph", "obsidian", "cache"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Graph Config Cache

> [!summary]
> Graph config cache is the classification of `.obsidian/graph.json` and the plugin-owned keys in `.obsidian/app.json` as regenerable cache, not tracked state. Every value in these files derives deterministically from the `wiki/` topic tree plus the color palette table. The entire `.obsidian/` directory is gitignored. A deleted or corrupted `.obsidian/` is rebuilt by running `/claude-wiki-pages:obsidian-graph-colors`.

## Definition

ADR-0023 introduced the "regenerable cache" classification for the Obsidian graph configuration files. Before ADR-0023, the plugin attempted to incrementally maintain `.obsidian/graph.json` and `.obsidian/app.json` as tracked state — adding color groups for new topics, adjusting filters when the topic tree changed. This approach had two failure modes:

1. **Clobber race** — a running Obsidian can write its in-memory state back to `.obsidian/` at any time, overwriting the plugin's changes.
2. **Drift accumulation** — incremental updates left stale groups for deleted topics, wrong colors for renamed topics, and missing entries for new topics.

The solution: declare the config files as cache, not state. Cache has three properties:

- **Derivable** — every value is a function of the vault's topic tree and the skill's palette table; no value requires domain knowledge not present in those two inputs.
- **Idempotent** — rebuilding the cache always produces the same output given the same inputs, regardless of what the current `.obsidian/` contains.
- **Disposable** — deleting the cache files loses no information; the next rebuild restores them exactly.

## What is Gitignored

The entire `.obsidian/` directory is listed in the vault's `.gitignore`. This means:

- Graph color groups
- `userIgnoreFilters` in `app.json`
- `collapse-color-groups` in `graph.json`
- Any other Obsidian preferences

These are all regenerable from the wiki topic tree. Keeping them in git creates merge conflicts on every Obsidian restart without adding any information.

## Rebuild Command

```bash
/claude-wiki-pages:obsidian-graph-colors
```

This rebuilds the full graph config from scratch: scaffold, topic groups (one per top-level wiki folder), specials (`_sources` gray, `_synthesis` yellow), and `userIgnoreFilters` (excluding `raw/`, `_templates/`, `_proposed/`). It is safe to run at any time.

The polish agent also rebuilds or patches the config as part of its tail-of-write pass after every ingest. The config is rebuilt, not patched, so stale groups from deleted topics are automatically cleared.

## Why `output/` Stays Visible

The [[Wiki-Only Graph]] contract excludes plugin plumbing from Obsidian's index: `raw/`, `_templates/`, `_proposed/`. It does NOT exclude `vault/output/`. The `output/` directory is user-owned deliverable space — the user is expected to see and interact with files there. Excluding it would hide the user's own work product.

## Related Concepts

- [[Wiki-Only Graph]] — the broader decision to show only wiki pages in the graph; graph config cache is the implementation mechanism
- [[Graph Coloring]] — the color group management that the cache stores
- [[Polish Agent]] — rebuilds the cache as part of its idempotent tail-of-write pass
- [[Folder Note]] — the pages whose `path:wiki/<topic>` queries drive the color group entries in the cache
