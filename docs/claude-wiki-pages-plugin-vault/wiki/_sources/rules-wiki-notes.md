---
title: "Wiki Page Rules"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["rules", "wiki", "frontmatter", "wikilinks"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Wiki Page Rules

## Metadata

- **File**: `raw/repo/rules/wiki-notes.md`
- **Scope**: `vault/wiki/**/*.md`
- **Type**: Path-scoped rule file

## Summary

Defines the required format for every file under `vault/wiki/`. Covers frontmatter format (YAML arrays, quoted wikilinks, date format), content format (wikilinks for internal refs, heading hierarchy), file naming (kebab-case, forbidden chars), and bookkeeping obligations after creating or editing a page.

## Key Claims

Every wiki file needs a `type` field in YAML frontmatter. Allowed types: `source`, `entity`, `concept`, `synthesis`, `index`, `log`. Arrays use bracket syntax, not dash-list syntax. Wikilinks in frontmatter must be quoted. Dates use `YYYY-MM-DD`. No nested YAML objects. No tabs in frontmatter. Use `[[wikilinks]]` for all internal references, never raw file paths. H1 for page title, `##` and below for body. Filenames are kebab-case. After creating a page: update `wiki/index.md`, update the folder note, and append to `wiki/log.md`.
Covers: Wiki Page Format, Frontmatter Rules, File Naming, Index Bookkeeping
