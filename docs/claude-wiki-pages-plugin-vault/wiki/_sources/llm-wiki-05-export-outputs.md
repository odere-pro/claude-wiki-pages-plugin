---
title: "User Guide 05: Export Outputs"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["guide", "export", "output"]
aliases: ["User Guide 05: Export Outputs"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# User Guide 05: Export Outputs

## Summary

How to produce deliverables from the wiki using the analyst agent. `vault/output/` is git-ignored scratch space. Synthesis notes belong in `wiki/_synthesis/`, not `output/`.

## Key Claims

- Analyst agent produces outputs: "compile a report on X for Y audience".
- `vault/output/` is git-ignored plain markdown: no frontmatter, no validation, not tracked.
- Canonical synthesis goes in `wiki/_synthesis/` — deliverables can cite it but not replace it.
- Do not put analysis in `output/` that belongs in `_synthesis/`; outputs are deliverables, synthesis is reasoning.
- Pandoc converts markdown to PDF/DOCX/HTML.

## Entities Mentioned

- [[Analyst Agent]]

## Concepts Covered

- [[Portable Markdown]]
- [[Synthesis Note]]

## Grounded Pages

Wiki pages that cite this source:

- [[Analyst Agent]] — export and compile modes
