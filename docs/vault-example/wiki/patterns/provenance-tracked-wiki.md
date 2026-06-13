---
title: "Provenance-Tracked Wiki"
type: concept
aliases: ["Provenance-Tracked Wiki", "provenance-tracked wiki", "provenance tracking"]
parent: "[[Patterns]]"
path: "patterns"
sources:
  - "[[Update an Existing Vault]]"
  - "[[Review, Validate, Fix]]"
  - "[[Export Data, Create Output]]"
  - "[[Check the Dashboard]]"
  - "[[Query the Wiki]]"
related:
  - "[[LLM Wiki Pattern]]"
  - "[[Entity Distribution Model]]"
  - "[[Hook-Enforced Guarantees]]"
  - "[[Querying the Wiki]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Provenance-Tracked Wiki

A wiki in which every claim on every page traces back to an identified source in `vault/raw/` through an unbroken chain of `sources:` wikilinks.

## Definition

A provenance-tracked wiki enforces the rule that no claim exists without a traceable origin. The chain runs from a raw source file through a source summary page in `wiki/_sources/` to one or more entity or concept pages in the topic tree, and finally to any query answer or synthesis note that cites those pages.

The chain is: `vault/raw/<source-file>` → `wiki/_sources/<source-slug>.md` (type: source) → `wiki/<topic>/<page>.md` (entity/concept, `sources: ["[[Source Title]]"]`) → query answer citing `[[Page Title]]`.

Breaking any link in the chain — a page without a `sources:` entry, a source summary not cited by any wiki page — is a schema violation flagged as an error or warning by `verify-ingest.sh`.

## Key Principles

`sources:` is non-negotiable — every entity, concept, topic, project, and synthesis page must list at least one source note in `wiki/_sources/`. The `validate-frontmatter.sh` hook blocks writes that omit it.

`confidence:` reflects evidential weight — 1.0 is reserved for direct quotes or settled facts from an authoritative source; 0.8 requires at least two independent sources; 0.6 is appropriate for single-source internal claims; below 0.5 signals inference not supported by explicit source text.

`derived: true` makes inference explicit — when a page represents LLM synthesis across sources rather than a claim stated in any single source, `derived: true` flags it so a reviewer knows it carries less direct evidentiary weight. Confidence must stay below 0.8 on derived pages.

Orphan detection closes gaps — `verify-ingest.sh` checks that every source summary in `wiki/_sources/` is cited by at least one wiki page, and that no entity or concept page has an empty `sources:` array.

## Examples

A concept page about [[Hook-Enforced Guarantees]] lists four source summaries in its `sources:` field. A query answer citing that page can be audited by opening the page, reading the `sources:` list, and tracing each entry back to the raw file in `vault/raw/`.

A synthesis note produced by the analyst agent carries `derived: true` and `confidence: 0.7` because it synthesizes a pattern across three sources rather than quoting any single one directly.

## Related Concepts

- [[LLM Wiki Pattern]] — the broader pattern that makes provenance a core invariant rather than an afterthought.
- [[Entity Distribution Model]] — the mechanism that keeps `sources:` lists accurate as new raw sources arrive.
- [[Hook-Enforced Guarantees]] — the enforcement layer that prevents pages from being written without `sources:`.
- [[Querying the Wiki]] — the workflow where provenance chain auditing happens in practice.
