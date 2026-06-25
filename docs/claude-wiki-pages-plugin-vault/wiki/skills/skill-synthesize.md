---
title: "Synthesize Skill"
type: entity
entity_type: tool
aliases: ["Synthesize Skill", "synthesize", "/claude-wiki-pages:synthesize"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-synthesize|Synthesize Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "synthesize", "cross-topic-analysis"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Synthesize Skill

The `synthesize` skill writes a single new page under `vault/wiki/_synthesis/` with `type: synthesis` frontmatter, one page per invocation, covering a user-defined scope.

## Overview

Synthesize is the cross-topic analysis step — it looks across wiki pages (not just one topic) to find comparisons, themes, contradictions, gaps, or timelines. Every synthesis covers a defined scope and cites every source it rests on.

Invocation triggers: user names an explicit scope and asks for cross-topic analysis; `/claude-wiki-pages:query` offered to file an answer as synthesis and user accepted; ingest agent detects a synthesis opportunity.

## Key Facts

**`synthesis_type` enum** (closed, no default — deliberate choice required):
- `comparison` — two or more subjects compared on shared dimensions
- `theme` — a recurring pattern across pages
- `contradiction` — incompatible claims on the same topic from different sources
- `gap` — what the wiki does not cover that it should
- `timeline` — chronological ordering of events or decisions

**`scope:` contract**: at least two piped-basename wikilink entries required. A synthesis of one page is an extended page, not a synthesis.

**`sources:` contract**: at least one source entry.

**Single-page constraint**: one page per invocation. Multi-topic sessions become several synthesis notes, not one sprawling document.

**Completion signal**: `READY: wrote <path>; synthesis_type=<type>, scope=<N> pages, sources=<M>. Remember to refresh the vault MOC: /claude-wiki-pages:index.`

**Never**: edit an existing synthesis note — produce a new one and mark the prior one `status: superseded` in a separate invocation.

## Related

Follows `[[skill-query|Query Skill]]` (which may offer to hand off here) and precedes `[[skill-index|Index Skill]]` (to refresh the vault MOC after a new synthesis lands).
