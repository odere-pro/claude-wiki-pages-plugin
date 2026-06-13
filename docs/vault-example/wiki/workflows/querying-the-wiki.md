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

The practice of asking cited questions against accumulated vault knowledge, with answers that include `[[wikilink]]` references to every page drawn from.

## Definition

Querying the wiki is how the human extracts value from the accumulated knowledge in `vault/wiki/`. The query skill (`/claude-wiki-pages:query`) handles single cited questions: it reads the vault index, traverses the topic tree from the relevant folder note, synthesizes an answer with inline wikilinks, and appends a log entry. The analyst agent (`/claude-wiki-pages:claude-wiki-pages-analyst-agent`) handles deeper work: cross-topic comparisons, tables, document compilations, and challenge mode.

Every answer includes `[[wikilink]]` citations so the human can audit each claim by opening the cited page and checking its `sources:` field, `confidence:` value, and `updated:` date.

When the wiki does not have an answer, the skill says so explicitly. The correct response is to drop the missing material into `vault/raw/` and run the pipeline, or to record the gap as a `synthesis_type: gap` note in `wiki/_synthesis/`.

## Key Principles

Citations as first-class output — an answer without `[[wikilink]]` citations is incomplete. Every claim should end in a reference to the page it came from. This is how the [[Provenance-Tracked Wiki]] property surfaces at query time.

Audit the chain — when a cited page has `confidence < 0.7`, the claim is weakly evidenced. When `updated:` is more than 30 days old, the page may have been overtaken by newer sources. The human's job is to notice these signals and decide how much weight to give each cited claim.

Challenge mode for decisions — the analyst agent's challenge mode searches for contradicting sources, past decisions that argue against a proposal, and gaps in evidence. Use it before making a significant architectural or editorial decision.

Save novel answers as synthesis — when a query produces an insight that is not restatable from a single existing page, offer to file it as a synthesis note in `wiki/_synthesis/` with `synthesis_type`, `scope:`, and `sources:` capturing the provenance chain.

## Examples

A user asks `/claude-wiki-pages:query what does the wiki say about [[Hook-Enforced Guarantees]]?`. The skill returns a three-paragraph answer with five inline wikilinks, a list of cited pages, and a log entry recording the question.

A user asks the analyst agent to compare [[LLM Wiki Pattern]] and [[Hook-Enforced Guarantees]] in a side-by-side table. The agent reads both topic branches, produces a table, and saves the output to `vault/output/comparison.md` with wikilink citations.

## Related Concepts

- [[Provenance-Tracked Wiki]] — the property that makes query citations auditable.
- [[Exporting Outputs]] — the workflow for compiling query results into deliverable documents.
- [[Dashboard Monitoring]] — the alternative interface for browsing the vault by frontmatter values.
- [[LLM Wiki Pattern]] — the overall pattern that querying is the primary consumer of.
