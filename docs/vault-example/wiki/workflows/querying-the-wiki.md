---
title: "Querying the Wiki"
type: concept
aliases: ["Querying the Wiki", "querying the wiki", "query"]
parent: "[[Workflows]]"
path: "workflows"
sources:
  - "[[Query the Wiki]]"
  - "[[Export Data, Create Output]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[Provenance-Tracked Wiki]]"
  - "[[Exporting Outputs]]"
  - "[[Dashboard Monitoring]]"
  - "[[LLM Wiki Pattern]]"
depends_on:
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Querying the Wiki

Querying the wiki is the process of asking cited questions against accumulated knowledge. The query skill and the analyst agent are the two entry points; both return answers with `[[wikilink]]` citations so every claim is auditable.

## Basic query

```
/claude-wiki-pages:query what does the wiki say about [[LLM Wiki Pattern]]?
```

The skill reads `wiki/index.md`, traverses the topic tree, synthesizes an answer with inline wikilinks, and appends a log entry.

## Analyst agent (cross-topic)

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent <question>
```

For questions spanning topics, producing tables, comparisons, or document compilations. Also supports challenge mode:

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent challenge mode — I'm about to decide X. Push back.
```

Challenge mode searches for contradicting sources, gaps, and past decisions that argue against the proposal.

## Evaluating citations

When an answer cites a page, open it and check: `sources:` (is the claim backed by a real source?), `confidence:` (low = weakly evidenced), `updated:` (stale = may have been overtaken).

## Saving answers as synthesis

A good query answer can be filed as a synthesis note with `synthesis_type`, `scope:`, and `sources:` preserving the provenance chain.

## When the wiki has no answer

The query skill will say so. Do not invent an answer — instead drop the missing material into `vault/raw/` and run the pipeline, or record the gap as a `synthesis_type: gap` note.
