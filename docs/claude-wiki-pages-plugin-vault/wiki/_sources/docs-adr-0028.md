---
title: "ADR-0028: Dangling Wikilink Verify Check"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-15
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0028: Dangling Wikilink Verify Check

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-15
- **URL:** —

## Summary

ADR-0028 adds a dangling-wikilink WARN check to `verify-ingest.sh`. A link `T` is considered resolvable if its normalized target is a member of `{ filename stem } ∪ { title: } ∪ { aliases: }` over all wiki pages, case-insensitively. A link with no match is a dangling link (WARN). The bash twin (in `scripts/`) is kept in parity with the TypeScript engine check.

## Key Claims

Status: Accepted. The check level is WARN (not ERROR) because a dangling link is a quality issue, not a schema violation. The resolvable set is built per-vault at check time. The bash twin in `scripts/check-wikilinks.sh` must stay in parity with the engine's TypeScript check (gate-05-verify-parity enforces this). ADR-0030 later tightened the resolution model to be Obsidian-accurate (basename > alias priority).

Covers: Dangling Wikilink Check, Verify Warn, Bash-TS Parity, check-wikilinks.sh
