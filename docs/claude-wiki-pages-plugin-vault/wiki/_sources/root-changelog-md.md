---
title: "CHANGELOG"
type: source
source_type: manual
source_format: text
url: "https://github.com/odere-pro/claude-wiki-pages-plugin/blob/main/CHANGELOG.md"
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["root", "changelog", "releases"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# CHANGELOG

## Metadata

- **File**: `raw/repo/root/CHANGELOG.md`
- **Scope**: Release history
- **Type**: Keep a Changelog format

## Summary

Full release history following Keep a Changelog format with SemVer. Unreleased section at the time of capture documents major features including strict-tree topology, voice skill, host-project intake, folder notes (schema v3), autonomous maintenance, local model drafting, snapshot verb, SubagentStop commit backstop, wired sources, and numerous fixes.

## Key Claims

Strict-tree topology (ADR-0036) makes `parent` spine the only wikilink among visible pages; associations become nested tags. Schema v3 folder notes: `wiki/<topic>/<topic>.md` instead of `_index.md`; verified by `legacy-index-filename` WARN. Voice skill (#26): two registers (explanatory/engineer). Host-project intake (ADR-0024): wires the project's docs into `raw/wired/<name>/`. `snapshot` verb wraps every write phase in a git checkpoint. SubagentStop commit backstop ensures no LLM write escapes git. `fill-gaps` detects graph gaps + catalog-aware enrichment. Doctor D11 checks Obsidian link parity. Universal graph machinery: topics derived from vault's own `wiki/` folders via `src/core/topics.ts`. Escaped-pipe ghost twin fix: `normaliseTarget` strips trailing backslash from table-cited wikilinks.
Covers: Changelog, Schema V3, Strict-Tree, Voice Skill, Snapshot, AutoHeal, Release History
