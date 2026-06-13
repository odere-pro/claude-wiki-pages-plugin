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

The LLM Wiki Pattern is a note-taking approach described by Andrej Karpathy in which the human curates sources and the LLM maintains the wiki. The human drops raw sources into an immutable `raw/` directory; the LLM reads from `raw/`, writes to `wiki/`, and follows a schema file that serves as the single source of truth for structure and conventions.

## Core invariants

1. **Human curates sources** — raw sources are dropped into `vault/raw/` and are never modified.
2. **LLM maintains the wiki** — the LLM reads sources and writes structured, cited wiki pages.
3. **Schema authority** — `vault/CLAUDE.md` is the single source of truth that every skill and agent reads before touching anything.
4. **Provenance** — every claim in the wiki links back to a source in `vault/raw/` via `sources:` frontmatter.

## Division of labor

| Role | Responsibilities |
| --- | --- |
| Human | Drop sources, ask questions, curate the schema, approve restructures |
| LLM | Ingest, classify, cross-link, lint, synthesize, answer |

## claude-wiki-pages implementation

`claude-wiki-pages` implements this pattern as a four-layer stack (Data / Skills / Agents / Orchestration) with hook-enforced guarantees at every tool-call boundary. See [[Hook-Enforced Guarantees]] for the enforcement detail and [[Provenance-Tracked Wiki]] for the property this creates.
