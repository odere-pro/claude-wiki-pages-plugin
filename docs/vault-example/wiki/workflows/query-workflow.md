---
title: "Query Workflow"
type: concept
aliases: ["Query Workflow", "query-workflow"]
parent: "[[Workflows — Index]]"
path: "workflows"
sources:
  - "[[Query the Wiki]]"
related: ["[[LLM Wiki Pattern]]", "[[Output Compilation Workflow]]", "[[llm-wiki-stack]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["workflow", "query"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.8
---

# Query Workflow

## Definition

Ask the wiki a question; receive a prose answer whose every claim ends in a `[[wikilink]]` to the wiki page that justifies it. Two entry points: `llm-wiki-query` for single questions, `llm-wiki-stack-analyst-agent` for cross-topic analysis, challenge mode, and document compilation.

## Key Principles

- The skill reads `wiki/index.md` first, then traverses per-folder MOCs, then reads the matching pages; it does not search raw sources directly.
- Every answer claim cites a wiki page. To audit, open the cited page and check `sources:`, `confidence:`, and `updated:`.
- When the wiki lacks an answer, the skill says so — it does not invent one. The right move is either to drop new material into `raw/` and re-ingest, or to record the gap as a synthesis note with `synthesis_type: gap`.
- Every query appends a `## [YYYY-MM-DD] query | <summary>` entry to `wiki/log.md`.

## Examples

- `/llm-wiki-stack:llm-wiki-query what does the wiki say about the [[LLM Wiki Pattern]]?`
- `/llm-wiki-stack:llm-wiki-stack-analyst-agent compare [[LLM Wiki Pattern]] and [[Hook-Enforced Guarantees]]`
- Challenge mode: `/llm-wiki-stack:llm-wiki-stack-analyst-agent challenge mode — I'm about to decide X. Push back.`

## Related Concepts

- [[LLM Wiki Pattern]] — the pattern that makes the wiki queryable with citations.
- [[Output Compilation Workflow]] — the next step if the query needs to become a deliverable.
