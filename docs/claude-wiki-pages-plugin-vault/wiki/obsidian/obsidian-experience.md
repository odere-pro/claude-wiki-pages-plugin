---
title: "Obsidian Experience"
type: concept
aliases: ["Obsidian Experience", "obsidian experience", "graph view"]
parent: "[[Obsidian]]"
path: "obsidian"
sources: ["[[llm-wiki-obsidian-experience|User Guide: Obsidian Experience]]", "[[_sources/adr-0023-wiki-only-graph|ADR-0023: Wiki-Only Graph]]", "[[adr-0022-folder-notes-graph-quality|ADR-0022: Folder Notes and Graph Quality]]", "[[adr-0003-polish-agent|ADR-0003: Polish Agent and Obsidian-Side Experience]]"]
related: ["[[wiki-only-graph|Wiki-Only Graph]]"]
tags: ["concept", "obsidian", "guide"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Obsidian Experience

> [!summary]
> The Obsidian experience refers to the graph view, search results, and link autocomplete behavior that the Polish Agent maintains after every ingest or curator pass. The wiki-only graph (ADR-0023) shows only `wiki/` pages — `raw/`, `_templates/`, and `_proposed/` are excluded via `userIgnoreFilters`. Topic branches are color-coded. The graph state is regenerable cache: if `.obsidian/graph.json` is lost, re-run the graph-colors skill to rebuild it deterministically.

## Definition

The Obsidian experience is the graph view, search, and link autocomplete behavior that the Polish Agent maintains after every ingest or curator pass. It encompasses the wiki-only graph contract, topic color groups, and vault MOC regeneration.

## Key Principles

- The graph shows only generated wiki pages; `raw/`, `_templates/`, and `_proposed/` are excluded from the Obsidian index via `userIgnoreFilters`.
- Graph config is regenerable cache: `.obsidian/` is entirely gitignored and rebuilt deterministically from the `wiki/` topic tree.
- The polish agent owns three Obsidian-side steps: graph color application, `wiki/index.md` regeneration, and folder note reconciliation.
- Color groups are idempotent: the polish agent adds groups for new topic folders but never removes user-added groups.
- The headless fallback (direct `.obsidian/graph.json` write) works in CI but requires an Obsidian restart to take effect when Obsidian is running.

## Examples

Troubleshooting the Obsidian experience:

| Symptom                             | Remedy                                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| All graph nodes are one color        | Run `/claude-wiki-pages:obsidian-graph-colors`               |
| New topic folder has no color        | Run the polish agent after ingest                            |
| `raw/` files appearing in graph      | Polish agent re-asserts `userIgnoreFilters`; or add `"raw/"` manually |
| Corrupted `.obsidian/` state         | Delete `.obsidian/graph.json`; re-run `obsidian-graph-colors` |
| Page not showing up in search        | Confirm file is in `wiki/` and not in an excluded directory  |

## Overview

When the user opens the vault in Obsidian, they see the graph view, search, and link autocomplete. These features interact with the vault through Obsidian's index — which files it scans, how it resolves wikilinks, and what colors it assigns in the graph. The plugin maintains this Obsidian-side state automatically through the Polish Agent, which runs after every ingest or curator pass.

The core design principle (ADR-0023): the graph shows **only generated wiki pages**. Raw source files, templates, and staged drafts do not appear.

## Wiki-Only Graph (ADR-0023)

Three directories are excluded from Obsidian's index via `.obsidian/app.json` `userIgnoreFilters`:

```json
{
  "userIgnoreFilters": ["raw/", "_templates/", "_proposed/"]
}
```

This exclusion means:

- `raw/` markdown files (source materials) are not indexed, not searchable, and not visible in the graph.
- `_templates/` files do not appear as nodes.
- `_proposed/` drafts awaiting review are not visible until promoted to `wiki/`.

The polish agent asserts this list after every ingest (merge-only: it appends missing entries but never removes user-added entries).

**Why this matters:** before this exclusion, `raw/` files appeared in the graph as disconnected nodes (no wikilinks point to them from `wiki/`), cluttering the graph with source material that the wiki already summarizes in `wiki/_sources/`.

## Graph Color Groups

Each top-level topic folder under `wiki/` gets a unique color in the Obsidian graph view. The canonical color-group order (ADR-0023, first match wins):

1. **Topics** — one `path:wiki/<topic>` query per top-level topic folder, each with a unique color.
2. **Specials** — `_sources` → gray; `_synthesis` → yellow.

Color groups are stored in `.obsidian/graph.json` under `colorGroups`. They are **regenerable cache**: every value derives deterministically from the `wiki/` topic tree. If the file is lost or corrupted, delete it and re-run:

```
/claude-wiki-pages:obsidian-graph-colors
```

The skill rebuilds the full `colorGroups` array from the current topic tree.

## Polish Agent Responsibilities

The Polish Agent owns three Obsidian-side steps that run after every write:

1. **Graph color application** — adds color groups for any new top-level topic folders. Existing groups are skipped (idempotent).
2. **`wiki/index.md` regeneration** — rebuilds the vault MOC with current page counts from per-folder folder notes.
3. **Folder note reconciliation** — walks all folders under `wiki/` and appends any pages that are on disk but absent from the folder note's `children` list.

These three steps together ensure that after every `/claude-wiki-pages:wiki` run, the Obsidian graph is colored, the vault MOC is current, and all folder notes are consistent.

## Headless Fallback (ADR-0022)

When Obsidian is not running (no active Obsidian app) or the `obsidian-cli` reference skill is unavailable, the polish agent writes `.obsidian/graph.json` directly — merging into the existing file, touching only `colorGroups` and `collapse-color-groups`.

**Trade-off:** a running Obsidian may overwrite a direct file write with its in-memory state when it next saves. The safe procedure after a headless write: restart Obsidian, which re-reads `.obsidian/graph.json` from disk.

The headless fallback means graph colors are always applied, even in CI or terminal-only environments.

## Troubleshooting

| Symptom                                    | Cause                                            | Remedy                                                                                              |
| ------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| All graph nodes are one color (monochrome) | Color groups missing from `.obsidian/graph.json` | Run `/claude-wiki-pages:obsidian-graph-colors`                                                      |
| New topic folder has no color              | Polish agent not run after ingest                | Run `/claude-wiki-pages:claude-wiki-pages-polish-agent`                                             |
| `raw/` files appearing in graph            | `userIgnoreFilters` missing or overridden        | Polish agent re-asserts it; or manually add `"raw/"` to `userIgnoreFilters` in `.obsidian/app.json` |
| Corrupted `.obsidian/` state               | Partial write or conflict                        | Delete `.obsidian/graph.json`, re-run `obsidian-graph-colors`                                       |
| Page not showing up in search              | File not indexed by Obsidian                     | Check that the file is in `wiki/` and not in an excluded directory                                  |

## Folder Notes and Graph Quality (ADR-0022)

The `path:wiki/<topic>` color group query matches all files in the topic folder, including the folder note. Folder notes therefore inherit their topic's color — they do not need a separate color group.

For color groups to work correctly, every top-level folder under `wiki/` must be a genuine topic folder (containing a folder note). Files directly under `wiki/` — like `wiki/index.md` and `wiki/log.md` — do not belong to a topic and are not color-grouped.

## Sources-Section Rule (ADR-0022)

Every query answer must end with a `## Sources` section — numbered, research-paper style. This rule was introduced alongside folder-note quality improvements to ensure that Obsidian-rendered query answers always include the provenance chain, even when the answer is long enough that the sources section would scroll off.

```markdown
## Sources

1. [[analyst-agent|Analyst Agent]] — raw/docs/architecture.md
2. [[query-rules|Query Rules]] — raw/docs/llm-wiki/07-query-the-wiki.md
```

## Related Concepts

- Polish Agent — owns all three Obsidian-side steps
- [[wiki-only-graph|Wiki-Only Graph]] — the exclusion contract for the graph view
- Folder Note — drives the `path:wiki/<topic>` color group queries
- Vault Resolution — determines which vault Obsidian should open
