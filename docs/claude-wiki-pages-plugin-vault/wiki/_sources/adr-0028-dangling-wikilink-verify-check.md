---
title: "ADR-0028: Dangling-Wikilink WARN Check in Verify"
type: source
source_type: manual
source_format: text
date_published: 2026-06-14
date_ingested: 2026-06-15
tags: ["adr", "verify", "dangling-wikilink", "graph-quality", "parity"]
aliases: ["ADR-0028: Dangling-Wikilink WARN Check in Verify", "ADR-0028"]
sources: []
created: 2026-06-15
updated: 2026-06-15
status: active
confidence: 1.0
---

# ADR-0028: Dangling-Wikilink WARN Check in Verify

## Summary

Adds a WARN-tier dangling-wikilink check inside `verify` — no new command, no new flag. Emits `Finding{ severity: "warn", check: "wikilink-dangling" }` through the existing Report model. Uses one shared resolution rule (case-insensitive filename stem / `title:` / `aliases:`) identical in both TS and the bash twin in `verify-ingest.sh`, pinned by gate-05.

## Key Claims

- Severity is `warn` — a dangling link never changes `exitCode` (1 only on error), never blocks a write.
- One shared resolution model: a `[[Target]]` resolves iff its normalized target (strip `|alias`, `#heading`, `^block`, then `strip().lower()`) equals any page's filename stem, `title:`, or `aliases:` — case-insensitively.
- Counting unit: one finding per `(page, distinct-normalized-target)`. A page linking `[[Foo]]` three times yields one finding.
- Bookkeeping pages (root `index`/`log`/`manifest`, any `_index`, dashboard pages) are skipped as link subjects — same set that existing `verify` checks already skip.
- `docs/vault-example` (now `tests/fixtures/reference-vault` per ADR-0029) gains ~4 distinct (10 total) WARN findings from documentation placeholder links like `[[Page Title]]` — accepted as correct output.
- The resolution rule is a specification re-implemented natively on TS and bash sides; if it changes, both sides change in one commit or gate-05 fails.
