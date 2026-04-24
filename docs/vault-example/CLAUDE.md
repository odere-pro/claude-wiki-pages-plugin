# LLM Wiki — Schema and Conventions

## Schema

`schema_version: 1`

This file is the authoritative schema for any wiki operation. Skills and agents override their own defaults when those defaults conflict with the rules below.

## Purpose

This is a personal research vault following Karpathy's LLM Wiki pattern.
The LLM maintains the wiki. The human curates sources and asks questions.
Domain-agnostic — works for any research topic.

## Data layer layout

The vault is the Data layer of a four-layer stack (Data / Skills / Agents / Orchestration — see `docs/architecture.md` for the full picture). The Data layer itself has two directories:

- `raw/` is immutable source material. Never modify files here.
- `wiki/` is LLM-maintained. All knowledge pages live here.

`CLAUDE.md` (this file) is the schema read at the start of every operation. The LLM reads from `raw/`, writes to `wiki/`, and follows `CLAUDE.md`. An optional `output/` directory is git-ignored scratch space for deliverables (plain markdown, no schema, not validated).

## Directory structure

```
vault/
├── raw/                         # immutable source material
│   └── assets/                  # images, PDFs, attachments
├── wiki/
│   ├── index.md                 # master catalog of all pages
│   ├── log.md                   # chronological operations record
│   ├── _sources/                # one summary per ingested source
│   ├── _synthesis/              # cross-topic analysis
│   ├── <topic-a>/               # first-level topic cluster
│   │   ├── _index.md            # index for this branch
│   │   ├── <entity-or-concept>.md
│   │   └── <subtopic>/          # nested subtopic
│   │       ├── _index.md
│   │       └── <entity-or-concept>.md
│   └── <topic-b>/
│       ├── _index.md
│       └── ...
├── output/                      # optional scratch space for deliverables (git-ignored)
├── _templates/                  # frontmatter templates per type
└── CLAUDE.md                    # this file
```

All paths in this document are relative to `vault/`.

### Folder hierarchy rules

The wiki is organized as a **topic tree**, not by note type.
Each topic gets a folder under `wiki/`. Subtopics nest as child folders.
Every folder contains a `_index.md` that lists and links all notes in that folder and its children.

- Tree depth must not exceed **four levels**. Deeper nesting signals a need to split into a sibling topic.
- When ingesting a new source, determine which topic folder the extracted concepts and entities belong to.
- If no folder exists for a topic, create one with a `_index.md`.
- If a concept spans two topics, place it in the more specific one and add a `[[wikilink]]` from the other topic's `_index.md`.
- The `parent` frontmatter field links each note to its folder's `_index.md`, making the tree navigable both through folders and through wikilinks.
- Two special folders break the topic pattern:
  - `wiki/_sources/` holds source summaries (one per ingested source)
  - `wiki/_synthesis/` holds cross-topic analysis
    These are prefixed with underscore to sort them visually above topic folders.

## Frontmatter schema

Every note in the vault carries YAML frontmatter. Type lives in frontmatter, not in the folder path — a single topic folder can contain both entities and concepts side by side.

Six allowed types: `source`, `entity`, `concept`, `synthesis`, `index`, `log`. (`vault/output/` files are plain markdown — no frontmatter required, not tracked by this schema.)

The `log` type is used only for `wiki/log.md` (the operations log). It requires minimal frontmatter: `title`, `type`, `created`, `updated`. Log entries may use `[[wikilinks]]` to reference real pages (e.g., `[[LLM Wiki Pattern]]`), but when describing old/fixed/invalid link patterns, use backtick code formatting instead (e.g., `` `_index` `` not `[[_index]]`) — otherwise Obsidian creates ghost nodes in the graph.

### Source notes (`wiki/_sources/`)

```yaml
---
title: "Article or Document Title"
type: source
source_type: article | paper | policy | transcript | book | video | podcast | manual
source_format: text | image # default: text. Required if the original is not markdown/plain text.
attachment_path: "raw/assets/..." # required when source_format != text
extracted_at: 2026-04-16 # required when source_format != text
url: "https://..."
author: "Author Name"
publisher: "Publisher or Site"
date_published: 2026-04-10
date_ingested: 2026-04-16
tags: []
aliases: []
sources: []
created: 2026-04-16
updated: 2026-04-16
status: active | stale | superseded
confidence: 1.0
---
```

`source_format` defaults to `text`. The PDF / audio / video formats are deferred — extend the enum when those paths are implemented. When `source_format` is not `text`, both `attachment_path` and `extracted_at` are required, and `attachment_path` must point to a real file under `vault/raw/assets/`.

### Entity notes (type: `entity`, placed in topic folders)

Entities are concrete things: people, organizations, products, tools, services, standards, places.

```yaml
---
title: "Entity Name"
type: entity
entity_type: person | organization | product | tool | service | standard | place
aliases: []
parent: "[[Parent Index]]"
path: "topic-a/subtopic-a1"
sources: ["[[source-note-1]]", "[[source-note-2]]"]
related: ["[[other-entity]]", "[[concept-note]]"]
tags: []
created: 2026-04-16
updated: 2026-04-16
update_count: 1
status: active | stale | superseded
confidence: 0.9
---
```

### Concept notes (type: `concept`, placed in topic folders)

Concepts are abstract ideas: frameworks, theories, patterns, principles, methodologies.

```yaml
---
title: "Concept Name"
type: concept
aliases: []
parent: "[[Parent Index]]"
path: "topic-a/subtopic-a1"
sources: ["[[source-note-1]]"]
related: ["[[entity-note]]", "[[other-concept]]"]
contradicts: []
supersedes: []
depends_on: []
tags: []
created: 2026-04-16
updated: 2026-04-16
update_count: 1
status: active | stale | superseded
confidence: 0.8
---
```

### Synthesis notes (`wiki/_synthesis/`)

Synthesis notes are higher-order analysis: comparisons, themes, contradictions, gap analyses.

```yaml
---
title: "Synthesis Title"
type: synthesis
synthesis_type: comparison | theme | contradiction | gap | timeline
path: "_synthesis"
scope: ["[[concept-1]]", "[[concept-2]]", "[[entity-1]]"]
sources: ["[[source-1]]", "[[source-2]]", "[[source-3]]"]
tags: []
created: 2026-04-16
updated: 2026-04-16
status: active | draft | stale
confidence: 0.7
---
```

### Index notes (`wiki/*/_index.md`)

Every topic folder contains a `_index.md` that serves as the navigable index for that branch of the tree.

```yaml
---
title: "Topic Name"
type: index
aliases: ["topic-name", "Topic Name"]
parent: "[[Parent Index]]"
path: "topic-a/subtopic-a1"
children: []
child_indexes: []
tags: []
created: 2026-04-16
updated: 2026-04-16
---
```

**`aliases`** — every index must include aliases that reflect the topic it represents. Use the topic name in common variations (lowercase slug, title case, abbreviations). This ensures wikilinks resolve when other pages reference the topic by any name variant.

### Graph coloring

Topic branches are color-coded in Obsidian's graph view via the internal graph plugin API. The `/llm-wiki-stack:obsidian-graph-colors` skill manages this programmatically using `obsidian eval`. Each topic folder gets a `path:` query mapped to a unique color. No frontmatter field needed — colors are applied at the Obsidian graph engine level.

When creating a new top-level topic folder, run `/llm-wiki-stack:obsidian-graph-colors` (or the ingest pipeline handles it automatically in step 1.7). The `llm-wiki-lint-fix` agent also checks for missing color groups and applies them.

### Field: `parent` placeholder form

Every non-root page has a `parent` wikilink that points to the containing folder's `_index.md`. Use the actual index title when it is known (e.g., `"[[Patterns — Index]]"`, `"[[Tools — Index]]"`). Use `"[[Parent Index]]"` only as a placeholder in templates.

### Output files (`output/`) — not part of the schema

`vault/output/` is user-owned scratch space for deliverables compiled from the wiki (reports, ADRs, memos, exports). It is git-ignored and plain markdown — no frontmatter, no validation, no type. Reference wiki pages with `[[wikilinks]]` in body text if you want Obsidian to resolve them; otherwise any markdown is fine. Claude will not lint, index, or repair files here.

## Field definitions

**`type`** is the primary filter. Read only this field to decide which pages are relevant to an operation.

- Ingest touches `source`, `entity`, `concept`, `index`.
- Query reads `entity`, `concept`, `synthesis`.
- Lint scans all wiki types. Files in `vault/output/` are out of scope.

**`parent`** links a note to its folder's `_index.md`. Makes the tree navigable through wikilinks, not just the filesystem. Every note except top-level indexes must have a `parent`.

**`path`** records the folder path relative to `wiki/`. Enables Dataview queries scoped to a subtree.

**`sources`** is non-negotiable. Every wiki page links back to at least one source note in `wiki/_sources/`. No claim exists without a traceable origin in `raw/`.

**`confidence`** is a float between 0.0 and 1.0. Starts at 1.0 for facts directly stated in a source. Decays if contradicted by newer sources. Strengthens when multiple sources confirm the same claim. Update during ingest (when new sources reinforce or contradict) and during lint (periodic decay for unconfirmed claims).

**`status`** tracks lifecycle:

- `active` — current, maintained.
- `stale` — not updated despite newer related sources existing (flagged by lint).
- `superseded` — explicitly replaced by a newer page (the old page links to its replacement).
- `draft` — incomplete, needs more sources.

**`update_count`** tracks how many ingest operations touched this page. High count = well-evidenced. Low count = peripheral, candidate for review during lint.

**`contradicts` / `supersedes` / `depends_on`** are typed relationships that carry semantic meaning beyond flat wikilinks. Live in frontmatter. At 50+ pages, install obsidian-wikilink-types plugin for inline typed links.

**`aliases`** enable wikilink resolution. Obsidian resolves `[[X]]` by matching filenames or aliases — not titles. Since filenames are kebab-case but wikilinks use Title Case page titles, **the `title` value must always appear as the first entry in `aliases`**. Without this, every `[[Title Case Link]]` creates a ghost node in the graph. On index notes, also include the topic name in common variations (slug, title case, abbreviations).

**`created` / `updated`** use `YYYY-MM-DD` format.

## Ingest rules

When processing a new source from `raw/`:

1. Create a source summary in `wiki/_sources/` with correct frontmatter.
2. Extract entities and concepts from the source.
3. Determine which topic folder each entity/concept belongs to. Create the folder and `_index.md` if it does not exist.
4. Search the wiki for existing pages on each entity/concept.
5. **Update existing pages rather than creating duplicates.** This is the entity distribution model — ingesting one source rewrites/extends multiple existing pages rather than creating one summary.
6. Place new pages in the correct topic folder. Set the `parent` and `path` frontmatter fields.
7. Add the new source to the `sources` frontmatter field of every page touched.
8. Increment `update_count` on every page touched.
9. Update `updated` date on every page touched.
10. Update `confidence`: reinforce if confirming existing claims, weaken if contradicting.
11. Update the relevant `_index.md` files (add new pages to `children`, add new child folders to `child_indexes`).
12. Update `wiki/index.md` with any new pages.
13. Append to `wiki/log.md`: `## [YYYY-MM-DD] ingest | Source Title`

## Query rules

1. Read `wiki/index.md` first to find relevant pages.
2. For topic-scoped queries, start from the relevant `_index.md` and traverse downward.
3. Read matching pages. Follow wikilinks to gather context.
4. Synthesize an answer with `[[wikilink]]` citations to specific wiki pages.
5. If the answer is valuable and novel, offer to file it as a new synthesis page in `wiki/_synthesis/`.
6. Append to `wiki/log.md`: `## [YYYY-MM-DD] query | Question summary`

## Lint rules

Check for:

- **Orphan pages** — no inbound wikilinks.
- **Dangling links** — wikilinks to non-existent pages.
- **Stale pages** — not updated in 30+ days despite newer related sources existing.
- **Contradictions** — between pages on the same topic.
- **Missing pages** — concepts mentioned in prose but lacking their own page.
- **Missing frontmatter fields** — every field in the schema must be present.
- **Low confidence** — `confidence` below 0.5 (flag for review or removal).
- **Index consistency** — every note in a folder is listed in its `_index.md`; every `_index.md` links to its parent index.
- **Index aliases** — every `_index.md` must have `aliases` reflecting the topic (slug, title case, abbreviations).
- **Missing parent/path** — notes with missing or incorrect `parent`/`path` fields.
- **Excessive nesting** — folders deeper than four levels (signal to refactor).
- **Index consistency** — `wiki/index.md` matches actual wiki contents.

Report as Errors, Warnings, and Info items.
Append to `wiki/log.md`: `## [YYYY-MM-DD] lint | Health check`

Recommended schedule: every 10 ingests, or monthly.

## Readability

These rules keep pages scannable in Obsidian and in plain-markdown viewers. They complement, not replace, the frontmatter schema.

- **Heading depth cap: H4.** If a section needs H5, split the page.
- **At-a-glance block.** Any page longer than 150 lines must open, directly under the H1, with a `> [!summary]` callout of 5–8 lines that states the page's thesis, the key facts, and when to consult it. Encyclopedic pages stay long but become scannable.
- **Prefer callouts for emphasis.** Use `> [!note]`, `> [!warning]`, `> [!important]`, `> [!summary]` instead of runs of bold or italics.
- **One concept per page, one page per concept.** If two pages would overlap by more than 50%, merge them or pick a canonical one and link from the other.
- **Transclusion policy.** Default to `[[wikilink]] + 1–2-sentence summary` when referencing another page. Use `![[page#block-id]]` transclusion only when the same verbatim block must appear in two contexts (e.g., an effort table shared between a concept page and a synthesis). When you transclude, leave a short comment above the embed explaining why the canonical block lives elsewhere, so the next editor does not duplicate it back.
- **Line length and paragraph length.** Break lines at natural phrase boundaries, not fixed columns. Keep paragraphs at 5 sentences or fewer.
- **Aliases work for you.** Add every reasonable display variant (slug, title case, abbreviation) to `aliases` so Obsidian resolves wikilinks regardless of how a sibling page refers to the topic.
- **Confidence discipline.** Never default to `1.0`. Use `1.0` only for direct quotes or settled facts from an authoritative source. Use `0.8` only when at least two independent sources corroborate the claim. Use `0.6` for single-source internal-policy claims. Use below `0.5` for inference not supported by explicit source text. Record `confidence` honestly — lint enforces the single-source-≥0.8 check.

## Linking conventions

- Use `[[wikilinks]]` for all internal links. Never use raw file paths in prose.
- Link to the most specific page.
- Every wiki page must link back to at least one source.
- Use `aliases` in frontmatter for alternative names so wikilinks resolve.
- In frontmatter, use typed relationship fields (`contradicts`, `supersedes`, `depends_on`) for semantic links.
- Wikilink display text uses Title Case page titles, not filenames.

## Naming conventions

- Filenames use kebab-case: `article-title-here.md`
- Page titles inside files use Title Case: `# Article Title Here`
- Wikilinks reference page titles: `[[Entity Name]]`
- Index files are always named `_index.md`
- Source summaries match source title in kebab-case

## What does NOT belong in the wiki

- Raw source text (stays in `raw/`).
- Ephemeral task context.
- Git state.
- Calendar items.
- Anything that changes faster than weekly.

## Challenge mode

Before writing an ADR, proposal, or making a decision, query the wiki with a challenge framing:

> I'm about to decide [X]. Search the wiki for:
>
> - Past decisions on similar topics
> - Contradictions in my current understanding
> - Gaps in evidence
> - Sources that argue against this approach
>
> Push back on my assumptions.

## Scaling milestones

- **0–50 pages**: `index.md` plus `_index.md` per folder is sufficient. Focus on frontmatter consistency.
- **50–200 pages**: Install obsidian-wikilink-types for typed links. Run llm-wiki-synthesize for cross-branch connections.
- **200–500 pages**: Install qmd for local search. Confidence decay and stale detection become essential. Prune folders with 30+ notes.
- **500+ pages**: Consider splitting into multiple vaults by research domain.

## Skill compatibility — IMPORTANT

**This document (CLAUDE.md) is the authoritative schema. When any skill's default behavior conflicts with these rules, follow CLAUDE.md.** Skills ship with generic defaults (flat directory layouts, minimal frontmatter, plain-string sources); the schema here overrides all of them.

### llm-wiki skills (wizard, ingest, query, lint, fix)

These skills were written for a **flat** directory layout: `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`, `wiki/synthesis/`. This vault uses a **different** layout:

| Skill expects                                                 | This vault uses                              | Rule                                                                             |
| ------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| `wiki/sources/`                                               | `wiki/_sources/`                             | Always use `wiki/_sources/`                                                      |
| `wiki/entities/`                                              | topic folders (`wiki/<topic>/`)              | Place entities in the appropriate topic folder, not a flat `entities/` directory |
| `wiki/concepts/`                                              | topic folders (`wiki/<topic>/`)              | Place concepts in the appropriate topic folder, not a flat `concepts/` directory |
| `wiki/synthesis/`                                             | `wiki/_synthesis/`                           | Always use `wiki/_synthesis/`                                                    |
| Minimal frontmatter (`tags`, `sources`, `created`, `updated`) | Full schema (see above)                      | Always use the full frontmatter schema for the page's `type`                     |
| `sources` as plain strings                                    | `sources` as `[[wikilinks]]`                 | Always use wikilink syntax in the `sources` field                                |
| No `type` field                                               | `type` required on every page                | Always include `type` in frontmatter                                             |
| No `parent` / `path` fields                                   | Required on all pages except top-level index | Always set `parent` and `path`                                                   |
| No `_index.md` files                                          | Required in every topic folder               | Create `_index.md` when creating a topic folder                                  |
| No `aliases` on indexes                                       | Required on every `_index.md`                | Add topic name variants (slug, title case, abbreviations)                        |

When running `/llm-wiki-stack:llm-wiki-ingest`: follow the 13-step ingest rules in this document, not the skill's simpler defaults. The skill provides the workflow structure; this document provides the schema.

When running `/llm-wiki-stack:llm-wiki-lint`: check everything the skill checks PLUS the additional rules in this document (index consistency, parent/path validation, confidence thresholds, type field validation, nesting depth).

### llm-wiki-synthesize and llm-wiki-index

These skills were written for **project-folder vaults** (folders with `README.md` files), not wiki-structured vaults. Use them with these overrides:

- **llm-wiki-synthesize**: Write output to `wiki/_synthesis/`, not the vault root. Use the synthesis frontmatter schema from this document, not the skill's default frontmatter.
- **llm-wiki-index**: Use only for generating an overview of the full topic tree. Write output to `wiki/`, not the vault root. The per-folder `_index.md` files are maintained by the ingest workflow, not by this skill.

### obsidian-markdown, obsidian-bases, obsidian-cli

These are general-purpose Obsidian format skills. No conflicts — use as-is.
