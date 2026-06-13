---
title: "LLM Wiki Pattern"
type: concept
aliases: ["LLM Wiki Pattern", "LLM wiki pattern", "Karpathy wiki pattern"]
parent: "[[Patterns]]"
path: "patterns"
sources:
  - "[[Getting Started]]"
  - "[[Review, Validate, Fix]]"
  - "[[Query the Wiki]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[Provenance-Tracked Wiki]]"
  - "[[Entity Distribution Model]]"
  - "[[Hook-Enforced Guarantees]]"
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# LLM Wiki Pattern

A vault-based approach to personal research in which the human curates sources and the LLM maintains the structured wiki — described by Andrej Karpathy.

## Definition

The LLM Wiki Pattern divides knowledge work into two roles: the human drops raw sources into an immutable `raw/` directory, and the LLM reads from `raw/`, writes to `wiki/`, and follows a schema file (`vault/CLAUDE.md`) that is the single source of truth for structure and conventions.

The wiki accumulates over time as a provenance-tracked, cross-linked body of cited knowledge — not as an ephemeral chat transcript. Three core invariants hold: (1) raw sources are never modified after ingestion; (2) every claim on every wiki page cites at least one source summary in `wiki/_sources/`; (3) the schema file wins any conflict between the LLM's defaults and the vault's rules.

## Key Principles

Division of labor — the human decides what enters the vault; the LLM decides how it is structured and cross-linked. Neither side does the other's job.

Schema authority — `vault/CLAUDE.md` is read at the start of every operation. Skills and agents override their own defaults when those defaults conflict with it. If a guide disagrees with the schema, the schema wins.

Provenance by default — linking every page back to a source is not optional; it is how the wiki earns the trust of the human asking questions against it. See [[Provenance-Tracked Wiki]] for the full chain.

Structured updates over summaries — when a new source introduces material already present in the wiki, the pipeline updates existing pages rather than creating parallel summaries. This is the [[Entity Distribution Model]].

## Examples

A researcher drops seven articles about a new framework into `vault/raw/`. Running the ingest agent produces one source summary per article, updates existing concept and entity pages with new information, and creates pages for any new entities or concepts that have no existing page yet.

A user asks the query skill what the wiki says about [[Hook-Enforced Guarantees]]. The skill reads the vault index, traverses the relevant topic branch, and returns a cited answer with `[[wikilink]]` references to every page it drew from.

## Related Concepts

- [[Provenance-Tracked Wiki]] — the property this pattern creates: every claim traces to a source.
- [[Entity Distribution Model]] — the DRY rule that keeps the wiki from accumulating near-duplicate summaries.
- [[Hook-Enforced Guarantees]] — the enforcement layer that keeps writes compliant with the schema.
- [[Vault Scaffolding]] — the directory structure and bookkeeping files the pattern requires.
