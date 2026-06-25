---
title: "Lint Process"
type: concept
aliases: ["lint", "lint process", "vault audit", "verify vs lint", "structural audit"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "lint", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Lint Process

The advisory audit of the vault for quality, curation, and drift signals, producing WARN-severity findings that guide the curator without blocking writes — distinct from `verify`, which produces ERROR-severity findings that do block writes.

## Definition

The lint process is the set of checks run by the engine `lint` verb and the skill `/claude-wiki-pages:lint` to surface quality and structural drift in the vault. Unlike `verify` (which gates writes and exits non-zero on any ERROR finding), `lint` is advisory: it reports WARN-severity findings and exits 0 regardless of the count. WARN findings guide the curator agent and the user but never block an operation.

The engine's verify/lint split (ADR-0034) draws a hard line:

- **`verify`** — ERROR-severity, gates writes. Checks structural validity: schema compliance, required fields, resolvable `sources:` wikilinks, resolvable `parent:` links. A non-zero exit code from `verify` blocks the ingest pipeline from proceeding.
- **`lint`** — WARN-severity, advisory. Checks quality: dangling wikilinks, ghost links, orphan pages, stale pages, low confidence, index drift, tag vocabulary violations, non-spine wikilinks (ADR-0036). Exits 0 always.

Both compose from the same `src/core/report.ts` Report model, so their JSON output shape is identical. Both are exposed through the `engine` CLI; the skill `/claude-wiki-pages:lint` delegates to the engine rather than reimplementing checks.

## Key Principles

**WARN never blocks; ERROR always blocks.** This is the fundamental invariant. A page with 20 WARN findings can still be written; a page with 1 ERROR finding cannot. The severity split allows the ingest pipeline to write imperfect pages and then repair them in the curator step, rather than requiring perfection before any write.

**Checks covered by lint:**
- Orphan pages (no inbound wikilinks, degree 0).
- Dangling wikilinks (target page does not exist).
- Ghost wikilinks (link matches title/alias but not basename).
- Stale pages (not updated in 30+ days with newer related sources).
- Low confidence (below 0.5 — flagged for review or removal).
- Index drift (a page exists but is not listed in its folder note; a folder note's `child_indexes:` is out of date).
- Legacy index filename (`_index.md` in a v3 vault).
- Plain-string hierarchy links (`parent:` or `children:` not in `"[[wikilink]]"` form).
- Non-spine wikilinks (among visible topic pages, any link that is not a spine edge — ADR-0036, Info-level).
- Tag vocabulary violations (a registered tag used on fewer than `minTagUsage` pages — `vocabulary-tag-floor`).
- Wikilink collision (a basename that resolves to more than one page).

**`fix` auto-repairs what lint reports.** The `/claude-wiki-pages:fix` skill runs the curator's deterministic fix pass: it reads the lint report and applies mechanical repairs (adding missing `parent:` links, correcting `path:` values, rewriting plain-string hierarchy links to piped form). The curator agent applies both the mechanical and judgment fixes.

**Recommended schedule: every 10 ingests or monthly.** The lint process is not continuous; it is triggered explicitly or by the maintenance loop. The `heartbeat.sh` script surfaces a reminder at session start when a backlog exists.

## Examples

After a 15-page ingest run, `engine lint --target docs/vault --json` reports: `dangling wikilinks: 2 (concept-page.md, entity-page.md)`, `ghost links: 1 (sources-field in agents-page.md)`, `index drift: 1 (new-concept.md not listed in docs folder note)`. None of these are ERRORs; they are WARNs. The curator fixes all three in its next run.

The `verify-ingest.sh` gate (run by the `SubagentStop` hook after every ingest) calls both `engine verify` (ERROR gate) and `engine lint` (advisory). The ERRORs must be zero before the pipeline closes; the WARNs are surfaced in the final report as items for the curator.

## Related Concepts

The lint process is implemented by the engine `lint` verb (`src/commands/lint/`). It is the advisory twin of the `verify` verb (structural gate). Both are exposed to users through the `/claude-wiki-pages:lint` and `/claude-wiki-pages:fix` skills. The curator agent (`claude-wiki-pages-curator-agent`) is the primary consumer of lint output. The `scripts/verify-ingest.sh` script combines verify and lint into a single post-ingest check.
---
