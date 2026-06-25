---
title: "Search Skill"
type: entity
entity_type: tool
aliases: ["Search Skill", "search", "/claude-wiki-pages:search", "deterministic search"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-search|Search Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "search", "retrieval"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Search Skill

The `search` skill finds wiki pages by keyword with a deterministic, reproducible ranking backed by the engine's `search` command, returning a ranked candidate set rather than a synthesized answer.

## Overview

Search is the retrieval substrate: it returns ranked candidates so you know where to look, then `query` or `synthesize` does the reasoning. Use `search` to find or list pages; use `query` for a cited natural-language answer.

Invocation triggers: user wants to find or list pages by term, alias, or tag; an agent needs a candidate set before query/synthesize/compile.

## Key Facts

**Score invariant**: `hit.score === hit.matched.reduce((s,m) => s+m.points, 0)` — hard, always holds.

**Scoring channel order** (highest to lowest):
`title-phrase → title-term → alias-term → tag-term → body-term → synonym-term → stem-term → graph-edge`

**R1 candidate filters** (compose with AND):
- `--type <T>`: keep only pages with `type: T`
- `--folder <path>`: keep only pages under `<path>/`
- `--tag <tag>`: keep only pages whose `tags` list contains `<tag>` exactly

**Tier-2 deterministic recall** (no embeddings, no ML):
- Synonym lexicon (`_vocabulary.md` at vault root): query for "car" also matches pages with "automobile". Synonym matches score lower than exact (`W_TERM_TITLE_SYNONYM=2` vs `W_TERM_TITLE=5`). Absent lexicon degrades silently to exact-only.
- Porter stemmer: morphological variants found even when query uses base form. Stem matches score at `W_TERM_*_STEM=1`.

**R2 graph expansion** (`--graph` flag, off by default):
- After keyword scoring, walks `sources`, `related`, `depends_on` predicates up to N=2 hops
- Graph-only hits have `snippet: ""`
- BFS processes frontier in sorted vault-relative path order → byte-identical output

**Determinism guarantee**: same vault + same query + same lexicon → byte-identical `hits` array.

## Related

Provides candidates to `[[skill-query|Query Skill]]` (C1 budget-aware MOC descent reads `search --json` output).
