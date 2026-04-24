---
title: "LLM Wiki Pattern"
type: concept
aliases: ["LLM Wiki Pattern", "llm-wiki-pattern", "Karpathy's LLM Wiki Pattern"]
parent: "[[Patterns — Index]]"
path: "patterns"
sources:
  - "[[Using llm-wiki-stack]]"
  - "[[Getting Started]]"
related: ["[[Hook-Enforced Guarantees]]", "[[Entity Distribution Model]]", "[[Obsidian]]", "[[Claude Code]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["pattern", "knowledge-management"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.8
---

# LLM Wiki Pattern

## Definition

A research-management pattern: the human curates raw source material; an LLM derives and maintains a structured, cited wiki on top of that material. Provenance is structural — every wiki page links back to the source notes that justify it. Originally articulated by Karpathy.

## Key Principles

- Two distinct roles: human curates (drops sources into an immutable `raw/`), LLM maintains (writes everything in `wiki/`).
- Every wiki claim must carry a `[[wikilink]]` to a source note in `wiki/_sources/` — no claim without provenance.
- Topic-tree organization (folders by topic, not by note type) so a single topic folder holds both entities and concepts.
- Hand-edits are allowed but discouraged; the LLM workflow enforces invariants that hand-editing tends to break (see [[Entity Distribution Model]]).

## Examples

- A user drops a PDF transcript into `raw/`; the ingest pipeline writes a source summary, extracts mentioned people / organizations / concepts into typed pages under the right topic folder, and updates per-folder MOCs.
- A query against the wiki returns prose with inline `[[wikilinks]]`; the user audits each cited page's `sources:` and `confidence:` to judge the answer's strength.

## Related Concepts

- [[Hook-Enforced Guarantees]] — the mechanism that keeps the pattern safe from model drift.
- [[Entity Distribution Model]] — the DRY rule that prevents near-duplicate pages.
