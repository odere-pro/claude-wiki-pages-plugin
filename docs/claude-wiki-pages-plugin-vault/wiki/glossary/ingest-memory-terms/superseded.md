---
title: "superseded"
type: concept
aliases: []
parent: "[[ingest-memory-terms|Ingest and memory terms]]"
path: "glossary/ingest-memory-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "ingest-memory-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# superseded

## Definition

A source note whose document has a newer snapshot: `sync` adds optional frontmatter `superseded_by: "New Source"` to the older `_sources/` note. History stays intact — provenance is never rewritten; ingest's additive merge appends the new source when pages refresh.

## Key Principles

- A source note whose document has a newer snapshot: `sync` adds optional frontmatter `superseded_by: "New Source"` to the older `_sources/` note.
- Canonical term in the claude-wiki-pages **Ingest and memory terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `sync`
- `superseded_by: "New Source"`
- `_sources/`

## Related Concepts

Part of the **Ingest and memory terms** group: agent-session source, session learning, ingest-extract, local-ingest-stub, provenance-completeness, classification checklist.
