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

The process of compiling deliverables from the wiki into `vault/output/` as plain markdown — reports, ADRs, proposals, memos, and briefs — without schema or frontmatter.

## Definition

Exporting outputs is the downstream step after querying: the analyst agent reads the vault MOC and relevant folder notes, pulls named entities, concepts, and synthesis notes, and writes plain markdown to `vault/output/<slug>.md` with `[[wikilink]]` citations linking every claim back to its wiki page.

`vault/output/` is git-ignored scratch space. Files there are plain markdown with no frontmatter, no schema enforcement, and no validation. They exist only on local disk unless force-committed. Analysis that belongs in `wiki/_synthesis/` must not go into `output/`; deliverables can cite a synthesis note, but the synthesis itself stays inside the schema.

## Key Principles

Two patterns, not one — a narrative output is a document someone reads front-to-back, with its own voice. A navigation index is a short pointer document routing the reader to canonical wiki pages. Two narratives on the same topic drift; merge them or convert the lower-quality one into a navigation index.

Synthesis lives in the wiki — if a deliverable contains reasoning that is reusable or citable, it belongs in `wiki/_synthesis/` as a synthesis note, not in `vault/output/`. Deliverables should cite synthesis notes; they should not duplicate their content.

Version history on demand — because `vault/output/` is git-ignored, version history requires either force-adding specific files (`git add -f vault/output/<file>.md`) or keeping the canonical version as a synthesis note and regenerating the deliverable when needed. The second option is preferred for anything reused across queries.

Format conversion is external — markdown outputs can be converted to PDF, Word, or HTML with external tools such as pandoc. The plugin does not manage output formats.

## Examples

A user asks the analyst agent to compile a one-page brief on [[Hook-Enforced Guarantees]] for a new teammate. The agent writes `vault/output/hook-guarantees-brief.md` with inline wikilinks to the relevant wiki pages and a summary drawn from the four source summaries that back the concept.

A researcher notices they have written the same narrative twice in two different output files. They merge the better one into a synthesis note at `wiki/_synthesis/hook-enforcement-analysis.md` and replace the duplicate output with a navigation index pointing to it.

## Related Concepts

- [[Querying the Wiki]] — the workflow that precedes and informs output compilation.
- [[Provenance-Tracked Wiki]] — the property that makes the wikilink citations in outputs auditable.
