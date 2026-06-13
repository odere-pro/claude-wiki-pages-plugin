---
title: "Analyst Extract Mode"
type: concept
aliases: ["Analyst Extract Mode", "analyst extract mode", "Extract Mode", "Mode 4 Extract", "structured data extraction"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[Analyst Modes Skill (SKILL.md)]]", "[[Analyst Agent Source]]"]
related: ["[[Analyst Agent]]", "[[Analyst Dashboard Mode]]", "[[Analyst Document Compile Mode]]", "[[Query Rules]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "analyst", "extract", "data"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Analyst Extract Mode

## Definition

Analyst Extract Mode is Mode 4 of the five [[Analyst Agent]] operating modes. It extracts structured data from wiki pages into tables, lists, or machine-readable formats. The mode is designed for use cases where the user needs a portable structured view of frontmatter fields, relationships, claims, dates, or custom patterns — without requiring the Obsidian Dataview plugin. Unlike Mode 2 (Dashboard), which focuses on health metrics, Extract Mode is target-driven: the user declares exactly what data to pull and from which scope.

## Key Principles

**Extraction target declaration.** Before scanning, the analyst declares the extraction target: entities of a specific type, frontmatter fields (e.g. `confidence`, `update_count`, `status`), relationships (`related`, `depends_on`, `contradicts`), claims, dates, or custom patterns. Declaring the target first prevents unbounded reads.

**Scope declaration.** The analyst also declares the scope: a topic tree (e.g. `wiki/decisions/`), a page type (`type = "entity"`), a filter expression (`confidence < 0.7`), or the full wiki. The analyst estimates page count against the budget before scanning.

**Read method.** Pages are scanned via `Glob` (list) + `Read` (load frontmatter) + `Grep` (filter). The analyst does not inline awk heredocs — it reads YAML frontmatter directly via `Read`.

**Output formats.** Extract Mode supports four output formats:

| Format | Target | Use for |
|---|---|---|
| Markdown table | Inline in conversation | Human review |
| CSV | `vault/output/<name>.csv` | External tools, spreadsheets |
| Structured list | Inline, grouped by category with wikilinks | Navigation |
| Frontmatter report | Inline | All metadata for a filtered page set |

**Uncertainty annotation.** Any row where `confidence < 0.6` or `sources` contains fewer than 2 entries is annotated in the output. This prevents raw extraction output from being taken as settled fact when the underlying pages are weakly evidenced.

**Common extractions.** The skill catalogs frequently useful extraction patterns:

- All entities by type (people, tools, standards, organizations)
- All dates and deadlines across pages
- All pages with `status: stale` or `confidence < 0.7`
- Dependency graph (concepts depending on other concepts via `depends_on`)
- Evidence map (which sources support which wiki pages)
- Cross-reference matrix (which pages link to which)

## Examples

Extract all entity pages from the architecture folder with their confidence and update counts:

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent extract all entities in wiki/architecture/ — show title, entity_type, confidence, update_count as a markdown table
```

The analyst scans `wiki/architecture/` via Glob, reads frontmatter for each page where `type = "entity"`, builds a markdown table, annotates any row with `confidence < 0.6`, and appends to `wiki/log.md`. Low-confidence rows are flagged inline.

## Related Concepts

- [[Analyst Agent]] — the agent that implements all five modes including Extract
- [[Analyst Dashboard Mode]] — Mode 2; related in scope (reads many pages) but focuses on health metrics rather than raw data extraction
- [[Analyst Document Compile Mode]] — Mode 3; similar scoped read but produces narrative prose rather than structured data
- [[Query Rules]] — Mode 1; the full query workflow the analyst follows for question answering
