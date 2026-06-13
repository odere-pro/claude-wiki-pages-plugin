---
title: "Entity Distribution Model"
type: concept
aliases: ["Entity Distribution Model", "entity distribution model", "DRY ingest", "update not duplicate"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[User Guide 03: Update Existing Vault]]", "[[Architecture Documentation]]"]
related: ["[[Ingest Pipeline]]", "[[DRY Single-Sourcing]]", "[[Ingest Agent]]"]
tags: ["concept", "ingest", "dry"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Entity Distribution Model

## Definition

The entity distribution model is the DRY ingest rule: ingesting one source rewrites and extends multiple existing pages rather than creating one summary page per source. This prevents near-duplicate pages and enforces single-sourcing.

## Key Principles

- **Prefer updating over creating.** Before creating a new page, search the wiki for an existing page with a matching `title` or `aliases` value. If one exists, append rather than create.
- **One concept, one page.** If two pages would overlap by more than 50%, merge them or convert the lower-quality one into a navigation index.
- **Append sources as `[[wikilinks]]`:** add the new source to every touched page's `sources:` field.
- **Increment `update_count`:** high count = well-evidenced; low count = peripheral.
- **Example:** a source mentioning `[[Obsidian]]` appends that source to the existing `obsidian.md` page's `sources:` rather than creating a duplicate Obsidian page.

## Examples

- Ingesting a source about ADR-0022 → updates [[Folder Note]], [[Graph Coloring]], and [[Wiki-Only Graph]] pages (all already exist) by appending the new source and updating `update_count`.
- A new source about a completely new concept (e.g., "semantic search") → creates a new concept page under the appropriate topic folder.

## Related Concepts

- [[Ingest Pipeline]] — the 13-step process that enforces this model
- [[DRY Single-Sourcing]] — the broader principle of one fact, one page
- [[Ingest Agent]] — the agent that applies this model
