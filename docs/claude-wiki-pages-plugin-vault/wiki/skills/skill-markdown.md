---
title: "Markdown Skill"
type: entity
entity_type: tool
aliases: ["Markdown Skill", "markdown", "/claude-wiki-pages:markdown", "portable markdown export"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-markdown|Markdown Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "markdown", "export"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Markdown Skill

The `markdown` skill queries `vault/wiki/`, renders the answer as portable GitHub-flavored markdown, and writes it to `vault/output/<slug>.md` with all Obsidian-only syntax stripped.

## Overview

The publish-side counterpart to `/claude-wiki-pages:query`. Query stays in the conversation; markdown lands on disk. Used when the user explicitly asks to export, save, or render an answer as markdown, or by the analyst agent in Compile mode.

Do NOT invoke when the user just wants an answer in the chat — use `/claude-wiki-pages:query`. Do NOT invoke for synthesis notes — use `/claude-wiki-pages:synthesize`.

## Key Facts

**Rendering contract** (Obsidian → portable):
- Wikilinks: converted to relative path links when the target resolves; dropped to plain text when not
- Callouts: converted to bold-title blockquotes (`> **Title**` on first line, then `> body…`)
- Dataview blocks (fenced `dataview`): stripped entirely
- Block IDs (`^block-id`): stripped
- Embeds: become relative image links when the asset exists; otherwise dropped
- `## Sources` grounding ledger: **kept** — it is auditable output, not Obsidian-only syntax

**Output file frontmatter**: requires `generated_by: markdown`, `source_query: "<original question>"`, `generated_at: <YYYY-MM-DD>`, and `sources: [...]`.

**Slug**: kebab-case of the question, truncated to 60 characters, or an explicit name the user supplied.

**Reading contract**: same order as `/claude-wiki-pages:query` — `vault/CLAUDE.md` → `wiki/index.md` → folder notes → typed pages → `_synthesis/` → `_sources/`.

## Related

Shares the reading contract with `[[skill-query|Query Skill]]` and writes to the same scratch space as the analyst agent's Compile mode output.
