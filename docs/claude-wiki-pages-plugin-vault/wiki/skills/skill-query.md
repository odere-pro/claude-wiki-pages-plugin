---
title: "Query Skill"
type: entity
entity_type: tool
aliases: ["Query Skill", "query", "/claude-wiki-pages:query"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-query|Query Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "query", "retrieval"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Query Skill

The `query` skill answers natural-language questions from `vault/wiki/` with `[[wikilink]]` citations, using the C1 budget-aware MOC descent algorithm to select the reading set from the engine's ranked output.

## Overview

Unlike a general-purpose search, every claim in the answer carries a `[[wikilink]]` citation and every cited page must resolve. No hallucinated titles, no paraphrase without a source.

Invocation triggers: user asks a question about a topic covered in the wiki. Not for questions about the plugin itself — those are answered from docs.

## Key Facts

**C1 budget-aware MOC descent**:
1. Run `engine.sh search "<query>" --target <vault> --json` to get a `SearchHit[]` array ordered by `score` descending
2. Walk the list top-down; include each page until the context budget is exhausted
3. At the budget boundary, prefer hits with `title-phrase` or `title-term` in `matched[]` over `body-only` (channel-aware tie-breaking)
4. Never re-rank — C1 takes a score-ordered prefix, it never computes a new score or reorders by a different key
5. May additionally drop pages whose `score` falls below 20% of the top hit's score (subset filter, not a reorder)

**R3 retrieval contract**: one ranking produced once by search, shared by both paths. Agent path: structured JSON with `score + matched[] + wikilink`. Human path: rendered wikilink list ordered highest-scored first.

**Answer shape**: direct answer with inline citations → `### Supporting pages` list → `### Caveats` (omit if none) → `## Sources` grounding ledger (mandatory).

**Sources grounding ledger**: numbered entries, one per unique wiki page cited, tracing each to its `raw/` file via the `_sources/` summary. Never invent a raw path; write `(no raw source resolved)` when the chain does not resolve.

**Writing contract**: append one line to `wiki/log.md`; offer to file substantial answers as synthesis notes (gated — wait for user opt-in); never mutate any wiki page.

## Related

Used by `[[skill-search|Search Skill]]` (provides the ranked candidate set) and `[[skill-synthesize|Synthesize Skill]]` (receives a handoff when the user accepts the synthesis offer).
