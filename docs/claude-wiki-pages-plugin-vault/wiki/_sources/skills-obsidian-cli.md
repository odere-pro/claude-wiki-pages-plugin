---
title: "Obsidian CLI Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "obsidian-cli"]
aliases: ["Obsidian CLI Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Obsidian CLI Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/obsidian-cli/SKILL.md`
- Type: Skill definition for the `obsidian-cli` reference skill

## Summary

The `obsidian-cli` skill documents how to use the Obsidian CLI (`obsidian`) to interact with a running Obsidian instance — reading, creating, searching, managing notes, tasks, properties, and plugin/theme development. Requires Obsidian to be open.

## Key Claims

Covers: Obsidian CLI Skill, Command Syntax, File Targeting, Vault Targeting, Backlink-Safe Rename, Plugin Dev Cycle.

Parameters take values with `=`; flags are boolean. File targeting: `file=<name>` resolves like a wikilink; `path=<path>` is exact from vault root. Vault targeting: `vault=<name>` as first parameter, otherwise uses most recently focused vault. Backlink-safe rename uses `obsidian eval` with `app.fileManager.renameFile()`; the plugin wraps it in `obsidian-rename.sh` which resolves vault, confines to `wiki/`, and verifies the rename. CLI writes bypass PreToolUse hooks — always re-verify with `engine.sh verify` after a CLI rename.
