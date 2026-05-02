---
title: "Export Outputs"
type: source
source_type: manual
source_format: text
url: ""
author: "llm-wiki-stack maintainers"
publisher: "llm-wiki-stack plugin"
date_published: 2026-04-24
date_ingested: 2026-04-24
tags: ["documentation", "output"]
aliases: ["Export Outputs", "export-outputs"]
sources: []
created: 2026-04-24
updated: 2026-04-24
status: active
confidence: 1.0
---

# Export Outputs

## Metadata

- **Path in raw/:** `05-export-outputs.md`

## Summary

How deliverables (reports, ADRs, briefs, memos) are compiled from the wiki into `vault/output/` — git-ignored scratch space with no frontmatter, no schema, no validation. The `llm-wiki-stack-analyst-agent` agent is the right tool; it cites every claim with `[[wikilinks]]` back to wiki pages. Explains two healthy patterns (narrative output vs navigation index), the rule against two narrative outputs on the same topic, and the export path to PDF/DOCX via pandoc.

## Key Claims

- `vault/output/` is deliberately outside the schema — deliverables are not wiki content.
- Reusable deliverables belong in `wiki/_synthesis/` as proper synthesis notes; regenerate the deliverable from the synthesis when needed.
- Analysis that belongs in `_synthesis/` must not live in `output/`; outputs are deliverables, synthesis is reasoning.

## Entities Mentioned

- [[llm-wiki-stack]]
- [[Pandoc]]

## Concepts Mentioned

- [[Output Compilation Workflow]]
