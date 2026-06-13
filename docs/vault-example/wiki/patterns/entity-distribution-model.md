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

The ingest principle that one raw source rewrites many existing wiki pages rather than producing one new summary page per source.

## Definition

The entity distribution model is the DRY rule for the wiki. When the ingest pipeline processes a new source, it searches the wiki for existing pages whose `title` or `aliases` match each extracted entity or concept. When a match is found, the pipeline appends the new source to that page's `sources:` field, increments `update_count`, updates the `updated:` date, and extends the body with any new information from the source. A new page is created only when no matching page exists.

The result is that ingesting a single source typically touches several existing pages rather than creating one monolithic summary. The knowledge distributes across the topic tree where it belongs.

## Key Principles

Update before create — the pipeline greps for an existing page by `title` and `aliases` before creating anything new. This prevents near-duplicate pages that drift from each other over time.

`update_count` as evidence signal — a page with a high `update_count` has been touched by many sources and is well-evidenced. A page with `update_count: 1` is peripheral or under-evidenced — a candidate for review during lint.

DRY across ingest runs — the same entity mentioned in five separate sources ends up on one page with five entries in `sources:`, one coherent body, and a `confidence` value that reflects the weight of all five. This is more useful than five separate summaries that a querier has to reconcile manually.

## Examples

A new source about [[Obsidian]] is dropped into the vault and ingested. Rather than creating a second `obsidian.md`, the pipeline finds the existing page, appends `[[Check the Dashboard]]` to its `sources:`, increments `update_count` from 5 to 6, and adds any new facts from the source to the body.

A source introduces a concept that has no existing page. The pipeline creates a new page in the correct topic folder, sets `update_count: 1`, and records the source in `sources:`. On the next ingest that mentions the same concept, the pipeline updates that page rather than creating a duplicate.

## Related Concepts

- [[Ingest Pipeline]] — the workflow that enforces this model on every source processed.
- [[LLM Wiki Pattern]] — the broader pattern that this model keeps DRY and maintainable.
- [[Provenance-Tracked Wiki]] — the property that the distributed `sources:` fields collectively create.
