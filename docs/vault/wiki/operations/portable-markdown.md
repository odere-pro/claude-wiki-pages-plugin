---
title: "Portable Markdown"
type: concept
aliases: ["Portable Markdown", "portable markdown", "markdown export", "vault output"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Getting Started (source)]]", "[[Glossary]]", "[[Features]]"]
related: ["[[One Advertised Path]]", "[[Onboarding]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [export, markdown, output, operations]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Portable Markdown

GitHub-flavored markdown without Obsidian-only syntax (`[[wikilinks]]`, Dataview, callouts, block IDs). The output format produced by `/claude-wiki-pages:markdown` into `vault/output/`.

## Purpose

Enables sharing wiki query answers in non-Obsidian contexts — PR descriptions, emails, Notion documents. The `vault/output/` directory is git-ignored scratch space; files there are plain markdown, no frontmatter, no validation, no schema enforcement.

## How to Use

```text
/claude-wiki-pages:markdown what does the wiki say about <topic>?
```

Writes a portable markdown file to `vault/output/<slug>.md`. The `markdown` skill renders a query answer, strips Obsidian-only syntax, and deposits the result in `output/`.

## Distinction from Wiki Pages

Wiki pages under `wiki/` use Obsidian-flavored markdown (wikilinks, callouts, Dataview). Portable markdown files in `output/` are presentation-independent — they contain the same content but formatted for any markdown renderer.
