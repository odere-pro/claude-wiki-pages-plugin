---
title: "Engine API Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "engine-api"]
aliases: ["Engine API Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Engine API Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/engine-api/SKILL.md`
- Type: Skill definition for the `engine-api` reference skill

## Summary

The `engine-api` skill documents the LLM-facing contract for the deterministic Bun engine (`scripts/engine.sh`). It is reference material, not an action — it teaches the tool surface. Covers `verify`, `fix`, `heal`, `doctor`, `config`, `migrate`, `search`, `snapshot`, and `route` subcommands with their `--json` output shapes and exit codes.

## Key Claims

Covers: Engine API, Verify Command, Fix Command, Heal Command, Doctor Command, Config Command, Migrate Command, Search Command, Snapshot Command, Route Command, Multi-Vault Rules.

`heal` is the write-path closer: it checkpoints the vault in git, loops verify→fix→re-verify until clean or no progress, and commits the result. Exit 0 when clean, 1 when errors remain; rollback via `git revert <healCommit>`. `migrate` with `--write` performs the v2→v3 `rename-index` action, renaming each `_index.md` to its folder-note name and rewriting wikilinks. Always pass `--target <vault>` when a registry is configured; never omit it.
