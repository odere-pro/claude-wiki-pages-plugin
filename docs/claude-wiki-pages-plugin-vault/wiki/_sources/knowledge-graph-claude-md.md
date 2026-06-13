---
title: "Knowledge Graph Schema (CLAUDE.md)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["schema", "knowledge-graph", "claude-md"]
aliases: ["Knowledge Graph Schema (CLAUDE.md)"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Knowledge Graph Schema (CLAUDE.md)

## Metadata

- **Author:** claude-wiki-pages plugin project
- **Publisher:** claude-wiki-pages plugin project
- **Published:** 2026-06-13
- **URL:** raw/repo/knowledge-graph/CLAUDE.md

## Summary

The `raw/repo/knowledge-graph/CLAUDE.md` is the schema_version 3 schema document
delivered as part of the knowledge-graph sources drop. Its content is identical in
structure to the vault's authoritative `CLAUDE.md` — it defines the nine-type ontology
(source, entity, concept, topic, project, synthesis, index, manifest, log), required
fields per type, folder hierarchy rules, ingest/query/lint rules, ontology profile
(predicate domain→range table and enum list), and the three schema version history.

This source is the raw data backing the existing `wiki/reference/schema-authority.md`
concept page, which already captures all the key claims from this document.

## Key Claims

- Schema version 3 changes only the per-folder index convention: folder note named
  after its folder (`wiki/<topic>/<topic>.md`) instead of `_index.md`.
- The `### Required fields by type` table is machine-parsed by `validate-frontmatter.sh`
  using grep/awk — no Bun required.
- `entity_type` is the sole vault-extensible enum axis (via `entity_type_extensions:`).
- Every non-root page requires `parent` as a quoted `"[[wikilink]]"` value; plain
  strings produce no graph edge.
- `aliases` must include the `title` value as the first entry to prevent ghost nodes.
- The ontology profile (`ontology-profile-v1`) is the single named contract for
  predicate domain→range and enum list.

## Entities Mentioned

(No new entities — all relevant entities already tracked in wiki/)

## Concepts Mentioned

- Schema Authority (already tracked as `[[Schema Authority]]`)
- Ontology Profile v1 (already tracked as `[[Ontology Profile v1]]`)
- Folder Note (already tracked as `[[Folder Note]]`)
- Ingest Pipeline (already tracked as `[[Ingest Pipeline]]`)
- Lint Rules (already tracked as `[[Lint Rules]]`)
- Config Schema (new — `raw/repo/knowledge-graph/config.schema.json`)
- Frontmatter Parser (new — `raw/repo/knowledge-graph/frontmatter.ts`)
- Wikilink Extractor (new — `raw/repo/knowledge-graph/wikilinks.ts`)
