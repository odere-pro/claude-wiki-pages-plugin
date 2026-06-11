---
title: "Ingest Data Flow"
type: concept
aliases: ["Ingest Data Flow", "ingest data flow", "ingest pipeline flow", "one ingest"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture]]", "[[Features]]", "[[Operations]]"]
related: ["[[Four-Layer Stack]]", "[[Provenance]]", "[[Hook-Enforced Safety]]", "[[claude-wiki-pages-ingest-agent]]"]
contradicts: []
supersedes: []
depends_on: ["[[Four-Layer Stack]]"]
tags: [ingest, data-flow, pipeline]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Ingest Data Flow

The 11-step sequence that processes one raw source from drop to verified wiki state. All four layers are visible in the flow.

## Steps

1. Human drops a source into `vault/raw/`.
2. Human runs `/claude-wiki-pages:ingest` (or `/claude-wiki-pages:wiki` which routes to ingest).
3. Skill reads `CLAUDE.md` (the schema).
4. Skill writes a source summary to `wiki/_sources/`.
5. Layer 4 hooks fire: `validate-frontmatter.sh`, `check-wikilinks.sh`, `validate-attachments.sh`.
6. Skill extracts entities/concepts; updates existing wiki pages; creates new ones in topic folders.
7. Every touched page gets `sources` updated, `update_count` incremented, `updated` date set.
8. `_index.md` files in touched folders get new `children` entries.
9. `wiki/index.md` gets new pages.
10. `wiki/log.md` gets a `## [YYYY-MM-DD] ingest | Source Title` entry.
11. `SubagentStop` hook runs `verify-ingest.sh` — the human sees any drift immediately.

## Key Properties

- **Idempotency**: re-ingesting the same source updates existing pages rather than creating duplicates. The source manifest (`wiki/_sources/manifest.md`) tracks checksums for O(1) backlog detection.
- **Prefer update**: the ingest rule is to update existing pages over creating new ones.
- **Provenance**: every touched page links back to the new source.
