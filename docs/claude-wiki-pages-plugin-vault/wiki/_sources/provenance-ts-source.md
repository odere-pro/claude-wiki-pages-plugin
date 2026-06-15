---
title: "provenance.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "provenance", "verify"]
aliases: ["provenance.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# provenance.ts Source

## Summary

`src/core/provenance.ts` implements two orthogonal provenance checks that extend the verify check-set. CHECK 5a (source-presence): entity/concept/topic/project/synthesis pages MUST have at least one `sources:` entry. CHECK 5b (derived/confidence consistency): a page with `derived: true` MUST have `confidence < 0.8`. The avoid-double-flag contract ensures pages with malformed (non-wikilink) sources that already trigger CHECK 2 do not also trigger CHECK 5a — presence is counted by `sources.length`, not format.

## Key Claims

- `SOURCE_REQUIRING_TYPES = {entity, concept, topic, project, synthesis}` — these four are checked for non-empty sources.
- `SKIP_DIRS = ["_sources", "_synthesis"]` — exempt from provenance-completeness.
- Bookkeeping files (`index.md`, `log.md`, `manifest.md`, folder notes) are skipped via `isBookkeepingFile()`.
- CHECK 5a fires only when `sources.length === 0` (empty array), not for malformed entries.
- CHECK 5b: `derived === true` AND `confidence >= 0.8` → WARN-severity `provenance-consistency` finding.
- `derived` may be boolean `true` or string `"true"` (YAML coercion); both are accepted.
- Parity gate (`gate-05`) pins the counts to `scripts/verify-ingest.sh` CHECK 5 on CLEAN_VAULT, DIRTY_VAULT, and reference vault.
