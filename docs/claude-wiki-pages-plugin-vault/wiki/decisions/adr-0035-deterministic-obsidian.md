---
title: "ADR-0035: Deterministic Obsidian"
type: entity
entity_type: standard
aliases: ["ADR-0035", "adr-0035", "deterministic obsidian ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0035|ADR-0035: Deterministic .obsidian Config Generation]]"]
related: []
tags: ["docs", "adrs", "obsidian"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0035: Deterministic Obsidian

The decision to generate `.obsidian/` configuration files deterministically from the vault's topic tree so that vault openings are repeatable and the graph view is predictable.

## Overview

ADR-0035 formalizes that the plugin generates and regenerates `.obsidian/` config files (`app.json`, `graph.json`, `community-plugins.json`, `plugins/`) from the vault state every time. These files are treated as regenerable cache — not precious state — derived from `wiki/`.

## Key Facts

**Status:** Accepted

**Problem being solved:** Without managed `.obsidian/` config, every Obsidian user starts with a blank graph and must manually configure exclusions, color groups, and plugin settings. This produces inconsistent experiences and makes the graph topology (topic islands) opt-in rather than default.

**Decision:**

**`app.json` (index-level exclusions).** The plugin writes `userIgnoreFilters` to exclude bookkeeping from the Obsidian index: `raw/`, `_templates/`, `_proposed/`, `_inbox/`, `output/`, `CLAUDE.md`, `wiki/log.md`. These files never appear in graph, search, or autocomplete.

**`graph.json` (graph-view filter + color groups).** Exclusion filter removes `_sources/`, `_synthesis/`, and `index.md` from the drawn graph. Color groups: one query-scoped group per top-level topic folder, each a unique color (first-match-wins, top-down).

**Generation mechanism.** `scripts/obsidian-config.sh` (or the Bun path `scripts/obsidian-config.ts` when available) derives the color-group list from the current `wiki/` folder names. The `/claude-wiki-pages:obsidian-graph-colors` skill invokes `obsidian eval` when a running Obsidian instance is available; falls back to direct file write (headless fallback) when not.

**Regenerability invariant.** If `.obsidian/graph.json` is lost or mangled, delete it and re-run `/claude-wiki-pages:obsidian-graph-colors` — everything is rebuilt deterministically from the vault topic tree. The file is explicitly git-ignored in `raw/` (but committed in `wiki/` so collaborators share the same graph state).

**Trade-off:** A running Obsidian instance may clobber a direct file write with its in-memory state. The fix: restart Obsidian after a headless write. This is documented in the skills/obsidian-graph-colors headless fallback section.

## Related

ADR-0033 defined the graph topology (topic islands, exclusion layers) that this ADR's config generation implements. The polish agent runs `/claude-wiki-pages:obsidian-graph-colors` automatically after every ingest to keep the color groups in sync with the current topic tree.
