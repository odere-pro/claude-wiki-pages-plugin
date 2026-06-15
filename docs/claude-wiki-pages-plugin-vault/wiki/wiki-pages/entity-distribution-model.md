---
title: "Entity Distribution Model"
type: concept
aliases: ["Entity Distribution Model", "entity distribution model", "DRY ingest", "update not duplicate"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[llm-wiki-03-update-existing|User Guide 03: Update Existing Vault]]", "[[_sources/architecture|Architecture Documentation]]", "[[_sources/glossary|Glossary]]"]
related: ["[[ingest-pipeline|Ingest Pipeline]]", "[[ingest-agent|Ingest Agent]]", "[[schema-authority|Schema Authority]]", "[[lint-rules|Lint Rules]]"]
tags: ["concept", "ingest", "dry"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Entity Distribution Model

> [!summary]
> The entity distribution model is the DRY ingest rule: ingesting one source rewrites and extends multiple existing pages rather than creating one summary page per source. This prevents near-duplicate pages and enforces single-sourcing. The core principle is "update existing pages rather than creating duplicates" — a new source about `Obsidian` appends to the existing `obsidian.md` page's `sources:` rather than creating a duplicate page.

## Key Principles

- The core rule: before creating a new page, search the wiki for an existing page; if one exists, update it rather than creating a duplicate.
- A new source about a concept appends to the existing page's `sources:` and extends the body with new facts — one concept, one page, many sources.
- `update_count` becomes meaningful evidence: high count = well-evidenced, low count = peripheral candidate for lint review.
- Single-sourcing is enforced structurally by `sources:` wikilinks and by lint (near-duplicate detection flags pages with >50% content overlap).
- The ingest pipeline enforces the model at step 4/5 of the 13-step ingest rules; no other path may create wiki pages.

## Examples

When ingesting ADR-0022 (Folder Notes and Graph Quality):

- The existing [[folder-note|Folder Note]] page gains `"[[adr-0022-folder-notes-graph-quality|ADR-0022: Folder Notes and Graph Quality]]"` in its `sources:` and new detail about schema v3 naming conventions.
- The existing [[graph-coloring|Graph Coloring]] page gains the same source and new detail about canonical group order.
- No duplicate page is created for ADR-0022 itself — it is a source summary in `_sources/`, not a new concept page.

## Definition

The entity distribution model is how the ingest pipeline handles knowledge that overlaps with existing wiki content. The name comes from the idea that the knowledge contained in a raw source is _distributed_ across the existing pages that cover those concepts, rather than concentrated in one new summary page per source.

This is the DRY principle applied to knowledge management: one fact exists in exactly one wiki page, and new sources strengthen the evidence for that fact rather than creating a second copy of it.

## The Core Rule

Before creating a new page, search the wiki for an existing page with a matching `title` or `aliases` value. If one exists:

- Append the new source to its `sources:` field
- Extend the body with any new facts, edge cases, or design rationale from the new source
- Increment `update_count`
- Update `confidence` (reinforce if confirming; weaken if contradicting)
- Update the `updated` date

Only if no matching page exists should a new page be created.

## Why This Matters

Without this rule, ingesting 10 sources about "git checkpointing" would produce 10 near-duplicate pages. The wiki becomes a source dump rather than a distilled knowledge base. The signal-to-noise ratio collapses.

With this rule, the `update_count` field becomes meaningful:

- High `update_count` = well-evidenced concept, confirmed by many sources
- Low `update_count` = peripheral concept, candidate for review during lint

## The Single-Sourcing Invariant

The schema enforces this through lint:

- **One concept, one page.** If two pages would overlap by more than 50%, merge them (the curator's judgment-fix phase handles this).
- **`sources:` as wikilinks:** every source reference must be a wikilink to a source summary in `_sources/` — never a plain string, never a file path.
- **`update_count` tracking:** the ingest pipeline increments this on every touched page, so the evidence trail is visible in frontmatter.

## Examples from the Plugin

When ingesting ADR-0022 (Folder Notes and Graph Quality):

- The existing [[folder-note|Folder Note]] page gains ADR-0022 in its `sources:` and new detail about schema v3 naming conventions
- The existing [[graph-coloring|Graph Coloring]] page gains ADR-0022 in its `sources:` and new detail about canonical group order
- The existing [[wiki-only-graph|Wiki-Only Graph]] page gains ADR-0022 in its `sources:`
- A new page is created only for concepts that had no prior page

When ingesting a source about ADR-0001 (Four-Layer Orchestrator):

- [[orchestrator-agent|Orchestrator Agent]] page gains `sources: ["[[_sources/adr-0001-four-layer-orchestrator|ADR-0001: Four-Layer Orchestrator]]"]` and new context about the state-probing dispatch logic
- [[four-layer-stack|Four-Layer Stack]] page gains the source and possibly new text about the rationale for four layers

## What the Ingest Agent Does (13-Step Process)

The full ingest rule, from `vault/CLAUDE.md`:

1. Create a source summary in `wiki/_sources/` with correct frontmatter
2. Extract entities and concepts from the source
3. Determine which topic folder each entity/concept belongs to; create the folder and folder note if absent
4. **Search the wiki for existing pages** — this is where entity distribution happens
5. **Update existing pages rather than creating duplicates**
6. Place new pages in the correct topic folder; use the type's template
7. Add the new source to every touched page's `sources:` field
8. Increment `update_count` on every touched page
9. Update `updated` date on every touched page
10. Update `confidence`
11. Update the relevant folder notes
12. Update `wiki/index.md` with any new pages
13. Append to `wiki/log.md`

## Related Concepts

- [[ingest-pipeline|Ingest Pipeline]] — the 13-step process that enforces this model
- [[ingest-agent|Ingest Agent]] — the agent that applies this model
- [[schema-authority|Schema Authority]] — `vault/CLAUDE.md` defines the `update_count` semantics and `sources:` format rules
- [[lint-rules|Lint Rules]] — near-duplicate detection and single-source checks that enforce this rule
