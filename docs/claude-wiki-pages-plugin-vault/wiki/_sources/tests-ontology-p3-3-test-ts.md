---
title: "tests/engine/ontology-p3-3.test.ts"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "engine"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/engine/ontology-p3-3.test.ts`
- Role: P3.3 acceptance tests — `engine ontology --json` command contract

## Summary

Tests the ontology command's parser against the live schema file. Verifies: `.enums.type` returns exactly the 9 page-type values in document order; `.enums.entity_type` returns the 7 core values without extensions; a vault with `entity_type_extensions:[dataset,model]` makes them appear; `.predicates` length equals 11; predicates carry `extensible:false`; malformed/missing table produces non-zero exit and an error Finding.

## Key Claims

Covers: Engine Test Suite, Ontology Profile Validation
- NO-RAG: this is a markdown-table parse over one authored document — no corpus, no embeddings.
- The test resolves the canonical schema path at runtime (`skills/init/template/CLAUDE.md`) — the single authority.
- `entity_type_extensions` compose with the core set at read time — no second enum file.
