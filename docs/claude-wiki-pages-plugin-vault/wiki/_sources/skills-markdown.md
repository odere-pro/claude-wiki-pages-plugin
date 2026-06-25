---
title: "Markdown Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "markdown"]
aliases: ["Markdown Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Markdown Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/markdown/SKILL.md`
- Type: Skill definition for the `markdown` verb

## Summary

The `markdown` skill queries `vault/wiki/`, renders the answer as portable GitHub-flavored markdown, and writes it to `vault/output/<slug>.md`. It strips Obsidian-only syntax so the result is usable outside the vault.

## Key Claims

Covers: Markdown Skill, Rendering Contract, Portable Markdown, Sources Grounding Ledger in Export.

The rendering contract: wikilinks become relative markdown links when resolved, plain text when not; callouts become bold-title blockquotes; Dataview blocks are stripped entirely; block IDs are stripped; embeds become relative image links when the asset exists. The `## Sources` grounding ledger is kept in the export — it is auditable output, not Obsidian-only syntax. The output file carries a frontmatter block with `generated_by: markdown`, `source_query`, `generated_at`, and `sources`. Do not invoke for synthesis notes; use `/claude-wiki-pages:synthesize` for those.
