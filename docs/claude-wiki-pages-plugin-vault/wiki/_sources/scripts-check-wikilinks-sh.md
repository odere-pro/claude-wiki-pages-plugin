---
title: "scripts/check-wikilinks.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/check-wikilinks.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/check-wikilinks.sh

## Summary

PreToolUse advisory hook that blocks wiki files using plain markdown href syntax instead of Obsidian wikilinks. CLI mode delegates to `engine lint --check md-links`; hook mode delegates to `engine hook --gate check-wikilinks`. After Phase 1 migration the bash inline logic was retired in favour of the Bun engine.

## Key Claims

Fail-open advisory gate: wikilink style is not a security boundary, so when Bun is absent the write proceeds rather than being blocked. CLI mode exits 2 when the vault wiki directory is absent for backward compatibility. Exit 0 = clean, exit 1 = violations found, exit 2 = bad args.

Covers: Wikilink Format Enforcement, Advisory Hook, Markdown Link Detection
