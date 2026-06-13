---
title: "Entity Distribution Model"
type: concept
aliases: ["Entity Distribution Model", "entity distribution model", "EDM"]
parent: "[[Patterns]]"
path: "patterns"
sources:
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
related:
  - "[[Ingest Pipeline]]"
  - "[[LLM Wiki Pattern]]"
  - "[[Provenance-Tracked Wiki]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Entity Distribution Model

The entity distribution model is the ingest principle that one source rewrites many existing wiki pages rather than creating one summary page per source. It is the DRY rule for the wiki: when a new source mentions an entity or concept that already has a wiki page, the pipeline appends that source to the existing page's `sources:` field and extends the body, rather than creating a duplicate.

## How it works

1. Before creating a new entity or concept page, the ingest workflow greps the wiki for an existing page whose `title` or `aliases` match.
2. If a match is found, the pipeline appends the new source to `sources:`, increments `update_count`, updates `updated:`, and extends the body with new information from the source.
3. If no match is found, a new page is created in the correct topic folder.

## Why it matters

- **High `update_count`** on a page signals it is well-evidenced and central to the vault.
- **Low `update_count`** signals a page is peripheral or under-evidenced — a candidate for review during lint.
- Without this model, repeated ingestion of overlapping sources produces near-duplicate pages that drift from each other, breaking query reliability.

## Enforcement

The `check-wikilinks.sh` hook and the lint skill's near-duplicate detection catch cases where the model created a duplicate instead of updating an existing page. The ingest workflow's grep step is the primary prevention mechanism.
