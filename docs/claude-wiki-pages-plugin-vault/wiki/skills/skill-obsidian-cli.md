---
title: "Obsidian CLI Skill"
type: entity
entity_type: tool
aliases: ["Obsidian CLI Skill", "obsidian-cli", "/claude-wiki-pages:obsidian-cli", "obsidian command line"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-obsidian-cli|Obsidian CLI Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "obsidian-cli"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Obsidian CLI Skill

The `obsidian-cli` skill documents how to use the `obsidian` CLI to interact with a running Obsidian instance — reading, creating, searching, managing notes, tasks, properties, and plugin/theme development.

## Overview

Requires Obsidian to be open. Parameters take a value with `=`; flags are boolean switches with no value. Run `obsidian help` for an always-current command listing.

## Key Facts

**File targeting**:
- `file=<name>` — resolves like a wikilink (name only, no path or extension)
- `path=<path>` — exact path from vault root

**Vault targeting**: `vault=<name>` as the first parameter; without it, the most recently focused vault is used.

**Backlink-safe rename**: no dedicated rename command — use `obsidian eval` with `app.fileManager.renameFile()` to update all backlinks from the metadata cache. For wiki-page renames in this plugin, use the wrapped `scripts/obsidian-rename.sh` helper (resolves vault, confines to `wiki/`, verifies the rename). Exit 0 = renamed + backlinks updated; exit 3 = skip, fall back to `git mv`.

**Important**: CLI writes bypass the plugin's PreToolUse hooks — always re-verify (`engine.sh verify`) after a CLI rename.

**Plugin dev cycle**: reload plugin (`plugin:reload`) → check errors (`dev:errors`) → verify visually (`dev:screenshot` or `dev:dom`) → check console (`dev:console`).

**`obsidian eval`**: run arbitrary JavaScript in the app context. Used by `obsidian-graph-colors` to apply color groups via the internal graph plugin API and save them via `graph.saveOptions(graph.options)`.

## Related

Governed by the guard contract in `[[skill-obsidian-vault|Obsidian Vault Skill]]` (always scope to the resolved vault).
