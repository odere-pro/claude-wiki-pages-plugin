---
title: "Obsidian Markdown Skill"
type: entity
entity_type: tool
aliases: ["Obsidian Markdown Skill", "obsidian-markdown", "/claude-wiki-pages:obsidian-markdown", "Obsidian Flavored Markdown"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-obsidian-markdown|Obsidian Markdown Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "obsidian-markdown", "markdown-syntax"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Obsidian Markdown Skill

The `obsidian-markdown` skill documents Obsidian Flavored Markdown syntax extensions beyond standard CommonMark and GitHub-Flavored Markdown — a general-purpose reference with no plugin-specific conflicts. MIT-licensed (kepano/obsidian-skills).

## Overview

Use when working with `.md` files in Obsidian, or when the user mentions wikilinks, callouts, frontmatter, tags, embeds, or Obsidian notes. Standard markdown (headings, bold, italic, lists, quotes, code blocks, tables) is assumed knowledge.

## Key Facts

**Internal wikilink syntax**:
- `[[Note Name]]` — link to note
- `[[Note Name|Display Text]]` — custom display text
- `[[Note Name#Heading]]` — link to heading
- `[[Note Name#^block-id]]` — link to block
- `[[#Heading in same note]]` — same-note heading link

**Block IDs**: append `^my-block-id` to any paragraph; for lists and quotes, place the block ID on a separate line after the block.

**Embeds**: prefix any wikilink with `!` to embed inline: `![[Note Name]]`, `![[image.png]]`, `![[image.png|300]]`, `![[document.pdf#page=3]]`.

**Callout types**: `note`, `tip`, `warning`, `info`, `example`, `quote`, `bug`, `danger`, `success`, `failure`, `question`, `abstract`, `todo`. Add `-` after the type for collapsed by default; `+` for expanded by default.

**Frontmatter default properties**: `tags` (searchable labels), `aliases` (alternative note names for link suggestions — NOT a link resolution mechanism), `cssclasses` (CSS classes for styling).

**Link choice rule**: use `[[wikilinks]]` for notes within the vault (Obsidian tracks renames automatically); use standard markdown links only for external URLs.

## Related

Used alongside `[[skill-obsidian-cli|Obsidian CLI Skill]]` and `[[skill-obsidian-vault|Obsidian Vault Skill]]` when doing Obsidian-specific operations.
