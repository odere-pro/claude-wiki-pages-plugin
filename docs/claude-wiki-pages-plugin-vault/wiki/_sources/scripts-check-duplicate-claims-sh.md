---
title: "scripts/check-duplicate-claims.sh"
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

# scripts/check-duplicate-claims.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/check-duplicate-claims.sh

## Summary

Advisory duplicate-claim detector (ADR-0014 Part B). Thin wrapper over `engine lint --check dup-claims`. All logic lives in `src/core/duplicate-claims.ts`. Maps `--proposed <file>` to the engine's `--file <file>` argument. Exits 0 in all cases (advisory only, never blocks).

## Key Claims

Intended as a review step, not a hook gate. Supports a --proposed flag for checking a draft file against the existing wiki before promotion. Exits 0 always so it never interrupts a promotion workflow. Warning-only because duplicate claims in a growing wiki are expected and resolved by editorial judgment, not automation.

Covers: Duplicate Claim Detection, Advisory Lint, Draft Review
