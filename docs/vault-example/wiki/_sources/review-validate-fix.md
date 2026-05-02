---
title: "Review, Validate, Fix"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "validation"]
aliases: ["Review, Validate, Fix", "review-validate-fix"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Review, Validate, Fix

## Metadata

- **Path in raw/:** `04-review-validate-fix.md`

## Summary

Three levels of validation: `llm-wiki-status` (one-command smoke test), `llm-wiki-lint` (read-only audit), `llm-wiki-stack-curator-agent` (auto-repair). Lint reports; fix applies staged phases (sources, vault MOC, per-folder MOCs, parent/path, broken links, orphans, aliases, graph colors, flat-folder splits, body densification). Lists what the repair agent will NOT do: delete content, merge near-duplicates, create unresolvable wikilinks, lower confidence. Manual-review table covers near-duplicates, single-source high confidence, repeated blocks, orphan sources, and contradictions.

## Key Claims

- Lint only reports; fix mutates; the separation is deliberate.
- `subagent-lint-gate.sh` aborts agent completion if unresolved errors remain.
- Pages with `confidence ≥ 0.8` backed by a single source are a lint warning (single-source-high-confidence check).

## Entities Mentioned

- [[llm-wiki-stack]]

## Concepts Mentioned

- [[Hook-Enforced Guarantees]]
- [[Lint-Fix Workflow]]
