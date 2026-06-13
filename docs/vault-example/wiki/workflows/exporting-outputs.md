---
title: "Exporting Outputs"
type: concept
aliases: ["Exporting Outputs", "exporting outputs", "output", "outputs"]
parent: "[[Workflows]]"
path: "workflows"
sources:
  - "[[Export Data, Create Output]]"
  - "[[Query the Wiki]]"
related:
  - "[[Querying the Wiki]]"
  - "[[Provenance-Tracked Wiki]]"
depends_on:
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Exporting Outputs

Exporting outputs is the process of compiling deliverables from the wiki into `vault/output/` as plain markdown. Deliverables include reports, ADRs, proposals, memos, and briefs.

## vault/output/ properties

- Git-ignored scratch space — files live only on local disk unless force-committed.
- Plain markdown: no frontmatter, no schema, no validation.
- Not tracked by any skill or hook (except `protect-raw.sh` which ensures nothing lands in `raw/`).

## Producing output

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent compile a report on <topic> for <audience>
```

The agent reads the vault MOC and per-folder folder notes, pulls named entities, concepts, and synthesis notes, and writes to `vault/output/<slug>.md` with `[[wikilink]]` citations.

## Two healthy patterns

- **Narrative output** — the document someone reads front-to-back. Has its own voice.
- **Navigation index** — a short pointer document routing the reader to canonical wiki pages.

Two narratives on the same topic drift; merge them or convert the lower-quality one to a navigation index.

## Versioning

Prefer keeping canonical analysis as a synthesis note in `wiki/_synthesis/` and regenerating deliverables from it when needed. Force-commit specific files via `git add -f vault/output/<file>.md` when version history is required.

## Format conversion

```bash
pandoc vault/output/my-report.md -o my-report.pdf
pandoc vault/output/my-report.md -o my-report.docx
```
