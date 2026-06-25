---
title: "scripts/lint-structural.sh"
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

# scripts/lint-structural.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/lint-structural.sh

## Summary

Template-skeleton conformance and no-raw-HTML checker. Thin wrapper delegating to `engine lint --check structural`. All logic lives in `src/core/structural-check.ts`. The bash implementation was retired after H12 (DRY/duplicated-code) was resolved by extracting the shared `_page_type()` helper to `scripts/lib-page-type.sh`.

## Key Claims

Exit 0 = no violations, exit 1 = warn-level violations (the engine exits 0 for warn-only; this wrapper remaps for backward compatibility), exit 2 = hard error. Callers include CI, skills, and the fill-gaps command. The backward-compatibility remap is done by checking whether the engine's text output contains warn-level findings.

Covers: Structural Conformance Lint, Template Skeleton Enforcement, No-Raw-HTML Check
