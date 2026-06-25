---
title: "Wikilink Extraction"
type: concept
aliases: ["wikilink-extraction", "extractWikilinks", "Markdown Link Guard"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-wikilinks|src/core/wikilinks.ts — Wikilink Extraction]]"]
related: []
tags: ["src", "core", "wikilinks", "extraction"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Wikilink Extraction

Wikilink extraction and the markdown-link guard from `core/wikilinks.ts`. Ports `scripts/check-wikilinks.sh check_content()` and the link-scraping in `scripts/verify-ingest.sh CHECK 1`.

## Definition

`core/wikilinks.ts` provides utilities to extract `[[Target]]` wikilinks from page bodies and detect prohibited markdown-style file links that would not resolve in Obsidian.

## Key Principles

**`extractWikilinks(body)`**: extracts all `[[Target]]` targets in document order via regex. Drops the alias portion after `|` (piped wikilinks → target only). Mirrors `grep -oE '\[\[[^]|]+'` followed by stripping `[[`.

**`duplicates(targets)`**: returns a `Map<string, number>` of targets appearing more than once with their counts. Used for index dedup (detecting duplicate entries in folder note `children:` lists).

**`markdownLinkViolation(content)`**: detects markdown-style file links (e.g., text followed by a path in parentheses ending in `.md`) in the page body. Ignores frontmatter and fenced code blocks. Uses the `s` (dotAll) flag to catch CR-containing link text. Returns the guard message or `null` when clean.

**`stripFencedBlocks(body)`**: removes fenced code blocks to avoid false positives on code examples. Matches the bash `sed '/^```/,/^```/d'`.

**Fenced block stripping purpose**: a source summary or tutorial page may contain example wikilinks inside code fences — those must not trigger the markdown-link guard.

## Examples

- Body `"See [[agents|Agents]] and [[hooks|Hooks]]"` → `["agents", "hooks"]`
- Body with duplicate targets → `duplicates()` returns `Map { "agents" → 2 }`
- Body with inline code span: link inside backtick span is not detected

## Related Concepts

- Used by the `verify` command's dangling-wikilink check (`checkDanglingWikilinks`)
- Used by hook gates (`wikilink-gate.ts`) to screen agent writes
- `link-resolver.ts` consumes extracted targets to build the link index
