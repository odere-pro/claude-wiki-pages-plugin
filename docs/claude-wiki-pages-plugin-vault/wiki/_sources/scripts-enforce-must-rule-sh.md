---
title: "scripts/enforce-must-rule.sh"
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

# scripts/enforce-must-rule.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/enforce-must-rule.sh

## Summary

PreToolUse advisory warning for CLAUDE.md edits. When an edit introduces an imperative "must / never / always" rule, reminds the author to back it with an enforcement hook or CI check. Non-blocking by design: always exits 0. Thin wrapper over `engine hook --gate must-rule`.

## Key Claims

Advisory only, never blocks. The engine writes the two-line notice to stderr with per-line must/never/always counts and always returns exit 0. Fail-open on missing Bun: the advisory is simply skipped. Path-filtered inside the engine; the hook matcher covers Write/Edit/MultiEdit broadly so any non-CLAUDE.md file is a no-op at the engine level.

Covers: Must-Rule Advisory, CLAUDE.md Edit Warning, Advisory Hook
