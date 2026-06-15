---
title: "Analyst Dashboard Mode"
type: concept
aliases: ["Analyst Dashboard Mode", "analyst dashboard mode", "Dashboard Mode", "Mode 2 Dashboard", "vault health dashboard"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[Analyst Modes Skill (SKILL.md)]]", "[[Analyst Agent Source]]"]
related: ["[[Analyst Agent]]", "[[Dashboard Write Gate]]", "[[Analyst Extract Mode]]", "[[Query Rules]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "analyst", "dashboard"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Analyst Dashboard Mode

## Definition

Analyst Dashboard Mode is Mode 2 of the five [[Analyst Agent]] operating modes. It generates either a live Dataview dashboard or a static markdown snapshot of vault health and coverage metrics. The mode distinguishes two output targets: `vault/wiki/dashboard.md` (Dataview, gated) and `vault/output/<name>.md` (static snapshot, ungated). The [[Dashboard Write Gate]] must be passed before writing to `dashboard.md`; static output to `vault/output/` requires no gate.

## Key Principles

**Scope declaration.** Before computing any metric the analyst declares the scope: full wiki, single topic tree, single page type, or a custom filter expression. Declaring scope first prevents unbounded reads on large vaults.

**Format declaration.** The analyst declares the output format: Dataview live dashboard or static snapshot. Static snapshots are portable — they do not require the Obsidian Dataview plugin and are readable in any markdown viewer. A Dataview dashboard adds live updates but ties readability to an Obsidian environment.

**Standard metric catalog.** Dashboard Mode defines six standard metric categories:

| Category     | What it measures                                                  |
| ------------ | ----------------------------------------------------------------- |
| Coverage     | Pages per topic, pages per type, source count                     |
| Health       | Orphan pages, broken links, stale pages, low-confidence pages     |
| Evidence     | Average `update_count`, sources per page, confidence distribution |
| Freshness    | Pages updated in last 7/30/90 days                                |
| Connectivity | Average `related` links, most/least linked pages                  |
| Gaps         | Entities mentioned in text but lacking their own page             |

**Confidence discipline.** A dashboard over pages with average confidence below `0.6` must include a caveat row noting that results may reflect weakly evidenced material. An orphan-heavy section must call that out explicitly rather than presenting orphan pages as normal content.

**Dataview patterns.** The skill documents two canonical Dataview query forms:

```dataview
TABLE title, type, status, confidence, updated
FROM "wiki/patterns"
WHERE type = "concept"
SORT confidence DESC
```

```dataview
TABLE title, length(sources) AS "evidence", update_count, confidence
FROM "wiki"
WHERE type = "entity" OR type = "concept"
SORT update_count DESC
```

## Examples

A typical Dashboard Mode invocation:

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent dashboard — static snapshot of all topics, focus on Health and Evidence metrics
```

The analyst declares scope (full wiki), format (static), reads pages via `Glob` + `Read` + `Grep`, computes health and evidence metrics, and writes the result to `vault/output/dashboard-YYYY-MM-DD.md`.

## Related Concepts

- [[Dashboard Write Gate]] — the approval gate that governs writing to `wiki/dashboard.md`
- [[Analyst Extract Mode]] — Mode 4; similar in that it reads and tabulates, but focused on structured data extraction rather than health metrics
- [[Analyst Agent]] — the agent that implements all five modes including Dashboard
- [[Query Rules]] — Mode 1; distinct in that it answers questions rather than producing metrics
