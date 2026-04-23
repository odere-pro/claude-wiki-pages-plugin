---
name: llm-wiki-ingest-pipeline
description: >
  Full wiki ingest pipeline: read raw sources, create structured wiki pages in
  a topic tree, fix structural issues, optimize the tree, and produce a
  synthesis note. Use when the user says "ingest pipeline", "full ingest",
  "ingest and optimize", "run the pipeline", or drops new files in vault/raw/
  and wants the complete ingest-fix-optimize cycle.
model: sonnet
tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# Wiki Ingest Pipeline

Four-step autonomous pipeline that takes raw sources and produces a fully
structured, tree-organized, cross-linked, and synthesized wiki.

**Read `vault/CLAUDE.md` before every run.** It is the authoritative schema.
Skill defaults that conflict with it MUST be overridden.

---

## Step 1 — Ingest

Read raw sources and produce structured wiki pages.

### 1.1 Identify unprocessed sources

```
Glob vault/raw/*.md
Read vault/wiki/log.md
```

Compare: any file in `raw/` whose filename does NOT appear in a `## [...] ingest |` log entry is unprocessed. Exclude `raw/assets/`.

### 1.2 Read each source completely

Read the full content of every unprocessed source file.

### 1.3 Create source summaries

For each source, write a summary to `vault/wiki/_sources/<slugified-name>.md`.

Frontmatter MUST follow `vault/CLAUDE.md` source schema exactly:

```yaml
---
title: "Source Title"
type: source
source_type: article | paper | policy | transcript | book | video | podcast | manual
url: ""
author: ""
publisher: ""
date_published: YYYY-MM-DD
date_ingested: YYYY-MM-DD
tags: []
aliases: []
sources: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: active
confidence: 1.0
---
```

Body: Summary, Key Claims, Entities Mentioned (as `[[wikilinks]]`), Concepts Covered (as `[[wikilinks]]`).

### 1.4 Plan the topic tree BEFORE writing pages

This is the critical design step. Before creating any entity or concept page:

1. List every entity and concept extracted from ALL sources.
2. Group them into a **topic tree** with subtopic folders.
3. The tree MUST use nested folders — NOT a flat list of 20+ files in one folder.

**Tree design rules:**

- **Max 8–12 pages per folder.** If a folder would exceed 12, split into subtopics.
- **Max depth: 4 levels** from `wiki/`.
- **Group by semantic domain**, not by source document.
- **Every folder gets a `_index.md`** immediately.
- Entities (people, orgs, tools, roles) cluster in a `roles/`, `tools/`, or named subtopic folder.
- Deliverables, build items, and templates cluster in a `deliverables/` or `templates/` subtopic.
- Blockers, decisions, and project-tracking items cluster in a `blockers/` or `project/` subtopic.
- Process concepts (flows, tiers, triggers) stay in the parent topic folder.

**Example target structure:**

```
wiki/<topic>/
├── _index.md                   # parent index
├── <concept-a>.md              # core process concepts stay here
├── <concept-b>.md
├── roles/                      # people, teams, governance roles
│   ├── _index.md
│   ├── <role-entity-1>.md
│   └── <role-entity-2>.md
├── deliverables/               # build items, templates, tooling
│   ├── _index.md
│   ├── <deliverable-1>.md
│   └── <deliverable-2>.md
└── blockers/                   # project tracking, decisions, blockers
    ├── _index.md
    └── <blocker-concept>.md
```

3. Write out the planned tree structure as a checklist before proceeding.
4. Confirm: no folder has more than 12 direct children. Refactor if needed.

### 1.5 Create/update wiki pages

For each entity and concept in the plan:

**If a wiki page already exists:**

- Read the existing page.
- Add new information from the source.
- Add the source to `sources:` (as `[[wikilink]]`).
- Increment `update_count`.
- Update `updated:` date.
- Update `confidence`: reinforce if confirming, weaken if contradicting.
- Note contradictions, citing both sources.

**If creating a new page:**

- Write to the correct topic subfolder per the tree plan.
- Use full frontmatter from `vault/CLAUDE.md` for the page's `type`.
- Set `parent:` to the containing folder's index **title** (e.g., `"[[Patterns — Index]]"`, not `"[[Parent Index]]"`).
- Set `path:` to the folder path relative to `wiki/`.
- Use `[[wikilinks]]` for ALL internal references.

**Entity frontmatter:**

```yaml
---
title: "Entity Name"
type: entity
entity_type: person | organization | product | tool | service | standard | place
aliases: []
parent: "[[Subtopic — Index]]"
path: "topic/subtopic"
sources: ["[[source-note]]"]
related: ["[[other-page]]"]
tags: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
update_count: 1
status: active
confidence: 0.9
---
```

**Concept frontmatter:**

```yaml
---
title: "Concept Name"
type: concept
aliases: []
parent: "[[Subtopic — Index]]"
path: "topic/subtopic"
sources: ["[[source-note]]"]
related: ["[[other-page]]"]
contradicts: []
supersedes: []
depends_on: []
tags: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
update_count: 1
status: active
confidence: 0.9
---
```

### 1.6 Create \_index.md for every new folder

Every topic or subtopic folder MUST have a `_index.md`:

```yaml
---
title: "Subtopic Name"
type: index
aliases: ["subtopic-name", "Subtopic Name"]
parent: "[[Parent Index — Title]]"
path: "topic/subtopic"
children: ["[[Page 1]]", "[[Page 2]]"]
child_indexes: ["[[Child Subtopic — Index]]"]
tags: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

**`aliases`** — include the topic name in common variations (lowercase slug, title case, abbreviations) so wikilinks resolve by any name.

Body: section headers grouping the children by theme, each with a `- [[Page]] — one-line summary` entry.

### 1.7 Apply graph colors for new topic folders

If new top-level topic folders were created, update the Obsidian graph color
groups so the new branches get a distinct color. Follow the `/llm-wiki-stack:obsidian-graph-colors`
skill workflow:

1. Read current color groups via `obsidian eval`
2. Add entries for new `path:wiki/<new-topic>` folders (pick next unused palette color)
3. Insert before the `_sources`/`_synthesis`/`_index` catch-all rules
4. Apply via `obsidian eval` + `graph.saveOptions()`

Skip this step if no new top-level folders were created.

### 1.8 Update index.md

Add every new page under the correct section. Group by topic heading, not by type.

### 1.9 Update log.md

Append:

```
## [YYYY-MM-DD] ingest | <Source Title>
Processed <filename>. Created N new pages, updated M existing.
New folders: ...
New entities: ...
New concepts: ...
```

---

## Step 2 — Lint & Fix

**Delegate to the `llm-wiki-lint-fix` agent.** It handles all structural repair.

Spawn the agent:

```
Agent(llm-wiki-lint-fix): Run a full lint and fix pass on the vault wiki.
The wiki was just updated by an ingest operation. Diagnose all structural
issues (broken wikilinks, orphans, plain-string sources, index drift, index
inconsistency, missing parent/path), fix everything you can, and report
what remains unresolved.
```

Wait for the agent to complete. Capture its report (issues found, fixed, unresolved).

If the agent reports unresolved ERRORs (not just WARNs), attempt to fix them
manually before proceeding. Common post-ingest errors:

- Title collisions from ingest creating a page with the same title as an index
- New folders created without `_index.md` (ingest step 1.6 should prevent this)
- Source summaries not yet referenced by any wiki page

---

## Step 3 — Optimize

Restructure the tree for navigability and consistency. This step runs AFTER
lint-fix has repaired structural issues.

### 3.1 Audit folder sizes

Count pages per folder. Any folder with > 12 direct `.md` children (excluding `_index.md`) needs splitting.

### 3.2 Refactor oversized folders

When splitting:

1. Identify semantic clusters within the folder.
2. Create subtopic subfolders with `_index.md` each.
3. Move pages into the appropriate subfolder.
4. Update each moved page's `parent:` and `path:` frontmatter.
5. Update the parent `_index.md`: remove moved children, add `child_indexes:` entries.
6. Update `wiki/index.md` to reflect new locations.

### 3.3 Cross-link related pages

For each page, review its `related:` array. Add any obvious missing relationships:

- Pages that share 2+ sources.
- Pages in the same subtopic folder.
- Pages that reference each other in body text.

### 3.4 Re-run lint-fix after restructure

If Step 3.2 moved pages or created folders, spawn `llm-wiki-lint-fix` again:

```
Agent(llm-wiki-lint-fix): Run a post-restructure lint and fix pass. Pages were
moved between folders and new _index.md files were created. Verify all
parent/path fields, index children arrays, and index entries are consistent
with the new structure. Fix any drift.
```

The output MUST show 0 errors. Warnings are acceptable if documented.

### 3.5 Log the optimize pass

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] optimize | Tree restructure
Moved N pages into subtopic folders. Created N new _index.md files.
Current tree: <summary of folder structure>.
```

---

## Step 4 — Synthesize

Produce cross-cutting analysis from the structured wiki.

### 4.1 Identify synthesis candidates

Read the full topic tree. Look for:

- **Critical path analysis** — blockers, dependencies, timeline risks.
- **Role responsibility matrix** — who owns what across all parties.
- **Contradiction detection** — claims that conflict across sources.
- **Gap analysis** — what the sources reference but never define.

Pick the 1–2 highest-value synthesis topics.

### 4.2 Write synthesis notes

Write to `vault/wiki/_synthesis/<slug>.md`:

```yaml
---
title: "Synthesis Title"
type: synthesis
synthesis_type: comparison | theme | contradiction | gap | timeline
path: "_synthesis"
scope: ["[[concept-1]]", "[[entity-1]]"]
sources: ["[[source-1]]", "[[source-2]]"]
tags: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: active
confidence: 0.8
---
```

Body structure:

- `## Overview` — 2–3 paragraph synthesis.
- `## Key Findings` — numbered insights with `[[wikilink]]` citations.
- `## Relationships` — how the scoped pages connect.
- `## Gaps` — what the wiki does NOT cover.
- `## Recommendations` — actionable next steps.

### 4.3 Update index.md

Add synthesis notes under `## Synthesis`.

### 4.4 Log the synthesis pass

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] synthesize | <Topic>
Created [[Synthesis Title]] from N wiki pages across M sources.
```

---

## Final report

After all four steps, report to the user:

```
## Pipeline complete

### Step 1 — Ingest
- Sources processed: N
- Source summaries created: N
- Entity pages created/updated: N
- Concept pages created/updated: N

### Step 2 — Fix
- Issues found: N
- Issues fixed: N
- Unresolved: N

### Step 3 — Optimize
- Folders created: N
- Pages moved: N
- Wikilinks added: N
- Final tree depth: N levels

### Step 4 — Synthesize
- Synthesis notes created: N
- Pages scoped: N
- Gaps identified: N

### Current wiki structure
<tree listing of folders and page counts>
```

---

## Model selection

This agent defaults to Sonnet for cost efficiency. Override to Opus when:

- Ingesting 10+ raw sources in a single pipeline run
- Sources are long-form (>5000 words) or contain complex domain material
- The topic tree has 100+ existing pages requiring careful merge decisions

---

## Hard rules

- **Read `vault/CLAUDE.md` at the start of every run.** It overrides everything.
- **Never modify files in `vault/raw/`.** They are immutable.
- **Use `[[wikilinks]]` everywhere.** Never use `[text](path)` in wiki pages.
- **Every wiki page has full frontmatter** per its `type` schema.
- **Every folder has `_index.md`.**
- **Max 12 pages per folder.** Split into subtopics if exceeded.
- **Max 4 levels deep.** Refactor into sibling topics if exceeded.
- **Prefer updating existing pages** over creating duplicates.
- **`sources:` field uses `["[[wikilinks]]"]`** — never plain strings.
- **`parent:` and `path:` are required** on every non-root page.
- **`aliases` must contain the page `title`** as the first entry. Obsidian resolves by filename/alias, not title — kebab-case filenames + Title Case wikilinks = ghost nodes without this.
- **Log every operation** to `wiki/log.md`.
