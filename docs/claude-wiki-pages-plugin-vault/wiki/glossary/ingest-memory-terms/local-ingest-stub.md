---
title: "local-ingest-stub"
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

# local-ingest-stub

## Definition

A lightweight ingest path (`/claude-wiki-pages:draft` with `localModel.enabled`) that routes new content through `_proposed/` for human review rather than writing directly to `wiki/`. Pc in the roadmap.

## Key Principles

- A lightweight ingest path (`/claude-wiki-pages:draft` with `localModel.enabled`) that routes new content through `_proposed/` for human review rather than writing directly to `wiki/`.
- Canonical term in the claude-wiki-pages **Ingest and memory terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `/claude-wiki-pages:draft`
- `localModel.enabled`
- `_proposed/`
- `wiki/`

## Related Concepts

Part of the **Ingest and memory terms** group: agent-session source, session learning, ingest-extract, provenance-completeness, classification checklist, superseded.
