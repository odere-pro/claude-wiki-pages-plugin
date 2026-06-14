---
title: "Dangling Wikilink"
type: concept
aliases: ["Dangling Wikilink", "dangling wikilink", "dangling link", "broken wikilink", "empty grey node", "unresolved wikilink"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[ADR-0027: Fill-Gaps Capability and Graph-Quality Detector]]", "[[ADR-0028: Dangling-Wikilink WARN Check in Verify]]"]
related:
  [
    "[[Graph Quality]]",
    "[[Fill-Gaps Skill]]",
    "[[Node Concentration]]",
    "[[Shell-TS Parity]]",
    "[[Parity Gate]]",
    "[[Deterministic Engine]]",
  ]
contradicts: []
supersedes: []
depends_on: ["[[Graph Quality]]"]
tags: ["concept", "wikilink", "dangling", "graph", "verify"]
created: 2026-06-15
updated: 2026-06-15
update_count: 1
status: active
confidence: 1.0
---

# Dangling Wikilink

## Definition

A dangling wikilink is a `[[Target]]` whose target resolves to no page in the wiki. In Obsidian's graph view, a dangling link renders as an empty grey node — visually present but pointing nowhere. Dangling links are quality/curation signals, not structural breaks.

## Detection Methods

Two complementary tools detect dangling wikilinks:

| Tool | Role | Severity | When Used |
|---|---|---|---|
| `scripts/graph-quality.sh` | Advisory scanner with full cluster metrics | Informational | Fill-gaps workflow quality gate |
| `engine verify` (ADR-0028) | Lean WARN-tier gate-path check | `warn` (never changes exit code) | Every `verify` call |

## Resolution Model

A `[[Target]]` resolves iff, **case-insensitively**, its normalized form equals some wiki page's filename stem, `title:` frontmatter, or one entry in `aliases:`.

**Normalization steps:**
1. Strip a trailing `|alias` (everything from the first `|`)
2. Strip a `#heading` or `^block` anchor (everything from the first `#`/`^`)
3. `strip().lower()` the remainder

**No space↔hyphen fuzzing** — that exact mismatch is what produces empty nodes. The resolver is deliberately strict.

## Verify Check Contract (ADR-0028)

The `verify` check emits `Finding{ severity: "warn", check: "wikilink-dangling" }` through the existing Report model. Key properties:
- Severity `warn` — never changes `exitCode`, never blocks a write
- Counting unit: one finding per `(page, distinct-normalized-target)`. Same link three times = one finding.
- Bookkeeping pages (root `index`/`log`/`manifest`, `_index`, dashboard pages) are skipped as link subjects.
- The resolution rule is **the same constant** in TS and the bash twin (`verify-ingest.sh`), pinned by gate-05.

## Resolution Strategies

When the fill-gaps skill encounters a dangling link, it resolves it by one of:
1. **Create a real, sourced page** with full frontmatter — the preferred resolution.
2. **Fix the link** by adding the correct target to its `aliases:` (alias/fuzzy match).
3. **Prose-ify** — convert `[[Target]]` to plain text when the link genuinely should not exist.

Resolution by an empty stub is **prohibited**. Resolution by fabricating a link to pass a gate is **prohibited**.

## Related Concepts

- [[Graph Quality]] — the detector that scans for dangling wikilinks
- [[Fill-Gaps Skill]] — the workflow that enforces `danglingCount == 0` as a gate
- [[Shell-TS Parity]] — gate-05 pins the dangling-wikilink resolution rule between TS and bash twins
- [[Deterministic Engine]] — the verify command where the check lives
