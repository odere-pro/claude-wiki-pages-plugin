---
title: "Query the Wiki"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Query the Wiki"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

Explains how to ask questions against the wiki with cited answers. Covers the basic `/claude-wiki-pages:query` skill (reads MOC, traverses topic tree, synthesizes with inline wikilinks), the analyst agent for deeper cross-topic queries, challenge mode for pressure-testing ideas, saving good answers as synthesis notes, and Dataview-based frontmatter queries.

## Key Claims

- Every claim in a query response should end in a `[[wikilink]]`; open the cited page to check `sources:`, `confidence:`, and `updated:`.
- The analyst agent can produce tables, comparisons, and document compilations across topics.
- Challenge mode searches for contradicting sources, gaps, and past decisions that argue against a proposal.
- A good answer can be filed as a synthesis note with `synthesis_type`, `scope:`, and `sources:` reflecting the provenance chain.
- When the wiki does not have an answer, the skill will say so — do not invent one.
- Dataview queries scope results by any frontmatter field (e.g., confidence < 0.7 in a topic folder).

## Entities Mentioned

- [[claude-wiki-pages Plugin]]
- [[Obsidian]]
- [[Dataview]]

## Concepts Covered

- [[Querying the Wiki]]
- [[Provenance-Tracked Wiki]]
- [[LLM Wiki Pattern]]
