---
title: "Obsidian Graph Colors Skill"
type: entity
entity_type: tool
aliases: ["Obsidian Graph Colors Skill", "obsidian-graph-colors", "/claude-wiki-pages:obsidian-graph-colors", "graph colors", "topic colors"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-obsidian-graph-colors|Obsidian Graph Colors Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "obsidian-graph-colors", "graph"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Obsidian Graph Colors Skill

The `obsidian-graph-colors` skill applies per-topic color groups to the Obsidian graph view via the internal graph plugin API, with a headless fallback that writes `vault/.obsidian/graph.json` directly.

## Overview

Graph colors and filters are regenerable cache — if `.obsidian/graph.json` is lost or mangled, delete it and re-run this skill to rebuild deterministically. The skill also sets the initial `app.json` exclusions that keep the vault's Obsidian experience focused on generated wiki pages.

## Key Facts

**Two-tier apply contract** (tried in order):
1. Preferred: `obsidian eval` + `graph.saveOptions(graph.options)` when the Obsidian CLI is available. Obsidian writes `graph.json` itself; open graph views can be refreshed in place.
2. Headless fallback: write `vault/.obsidian/graph.json` directly. Modifies only `colorGroups` and `collapse-color-groups`; preserves every other key. Prints exactly: `[fallback] graph-colors: wrote .obsidian/graph.json directly (restart Obsidian to load)`

**Initial graph configuration** (deterministic defaults):
- Search filter (island filter): excludes `raw/`, `_templates/`, `_proposed/`, `_inbox/`, `output/`, `wiki/_sources/`, `wiki/_synthesis/`, `wiki/log.md` from the drawn graph; keeps `wiki/index.md` as the ROOT hub
- `showTags: false` — tag nodes drown the topic structure
- `showAttachments: false` — `raw/assets/` binaries are provenance payload, not knowledge nodes
- `hideUnresolved: true` — dangling wikilinks are lint errors, not graph nodes
- `showOrphans: true` — orphan pages are a curator signal; hiding them masks what needs fixing
- `colorGroups: []` — starts empty; populated by the polish agent per new top-level topic

**`app.json` scaffold** (merged, never removes user entries):
- `userIgnoreFilters`: `["raw/", "_templates/", "_proposed/", "_inbox/", "output/", "CLAUDE.md", "wiki/log.md"]`
- `newFileLocation: "folder"`, `newFileFolderPath: "_inbox"`, `newLinkFormat: "shortest"` (routes Obsidian-created stubs to `_inbox/` instead of vault root)

## Related

Invoked by the polish agent after every ingest (Step 1.7) and directly via `/claude-wiki-pages:obsidian-graph-colors`.
