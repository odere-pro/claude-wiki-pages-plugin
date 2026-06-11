---
title: "Features"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [features, schema, dx, testing]
aliases: ["Features"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Features

## Summary

High-level feature overview of `claude-wiki-pages`: typed wiki pages with YAML frontmatter, provenance by construction, MOC maintenance, confidence discipline, synthesis notes, hook-enforced safety (immutable `raw/`, frontmatter validation, SubagentStop gates, append-only ops log), a five-tier test harness, and a comparison table against notable competitors.

## Key Claims

- Six page types in schema v1 (`source`, `entity`, `concept`, `synthesis`, `index`, `log`); v2 adds `topic`, `project`, `manifest`.
- Provenance is by construction: every non-source page carries a `sources:` field with `[[wikilinks]]` to raw content; plain strings are a lint error.
- Per-folder `_index.md` and vault-level `wiki/index.md` are auto-maintained by the pipeline.
- Confidence: ≥0.8 requires two corroborating sources; 1.0 requires a direct quote.
- `protect-raw.sh` blocks any attempt to rewrite a source file.
- Every Write and Edit goes through `validate-frontmatter.sh` and `check-wikilinks.sh`.
- SubagentStop completion gates prevent half-written wiki state after long ingest or lint-fix runs.
- Five test tiers: Tier 0 (static), Tier 1 (Bats, ~108 tests), Tier 2 (smoke), Tier 3 (release readiness), Tier 4 (adversarial corpus replay).
- Competitor comparison: obsidian-llm-wiki-local (local-LLM only), rvk7895/llm-knowledge-bases (bag of commands, no architecture), neither ships a security model.

## Entities Mentioned

- [[claude-wiki-pages]]
- [[Obsidian]]

## Concepts Covered

- [[Typed Wiki Pages]]
- [[Provenance]]
- [[MOC]]
- [[Confidence Discipline]]
- [[Hook-Enforced Safety]]
- [[Synthesis Note]]
- [[Test Harness]]
