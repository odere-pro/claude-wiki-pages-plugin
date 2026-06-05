---
name: ingest-pipeline
description: >
  The ingest pipeline's topic-tree plan format and confirmation gate, the opt-in
  destructive optimize (restructure) procedure, and the final-report template
  for claude-wiki-pages. Documents the plan/approval and restructure steps so the
  ingest agent can drive them without inlining the detail. Trigger when an agent
  or user asks "how does ingest plan the topic tree", "how does the optimize
  restructure work", or invokes /claude-wiki-pages:ingest-pipeline. Reference,
  not action.
allowed-tools: Read
disable-model-invocation: true
---

# Wiki Ingest Pipeline — Plan & Optimize Procedures (reference)

The Step 1.4 topic-tree plan + confirmation gate, the Step 3 optimize
(destructive restructure) procedure, and the final-report template for
`claude-wiki-pages-ingest-agent`. The agent reads this skill at the start of
Step 1.4 and Step 3, and when composing the final report. Schema authority
remains `vault/CLAUDE.md`; the contract, preflight, page-write steps, auto-heal
delegation, synthesis, model selection, and hard rules live in the agent body.

## Step 1.4 — Plan the topic tree (externalize, then confirm)

The topic-tree shape is the most consequential decision of the run. Errors here
cascade into every page's `parent:` and `path:`, and into the Obsidian graph
structure. Externalize the plan so the user can review or edit before any page
is written.

> **PDF sources (`source_format: pdf`):** when a source is a PDF under
> `raw/assets/`, apply the PDF ingest path documented in
> `skills/ingest/SKILL.md` — "PDF sources (I4): `source_format: pdf`" — before
> planning the topic tree. The required fields (`source_format: pdf`,
> `attachment_path`, `extracted_at`) must appear in the source note, and the
> PDF remains immutable in `raw/assets/` throughout. Classification and dedup
> proceed identically to text sources.

### 1.4a — Write the plan

Write to `vault/output/_pipeline-plan-YYYY-MM-DD.md` (git-ignored; no frontmatter required). Structure:

```
# Ingest plan — YYYY-MM-DD

## Sources in this run
- <source-1.md> — N entities, M concepts
- <source-2.md> — N entities, M concepts
...

## Entities and concepts extracted

> For each extracted item, apply the **classification checklist** in
> `skills/ingest/SKILL.md` — assign exactly one `type` (and, for entities,
> one `entity_type`) drawn from `ontology-profile-v1` in `vault/CLAUDE.md`.
> Never invent out-of-enum values; flag ambiguous cases for human review.
>
> Also apply the **two-pass alias-aware dedup** from `skills/ingest/SKILL.md`
> before marking any item as `new`. Pass 1 = exact title match; pass 2 =
> alias-aware match against existing pages' `aliases` fields. Mark items as
> `existing` if either pass matches, and plan an additive extension (never a
> duplicate). See "Dedup: two-pass existence check (I2)" in
> `skills/ingest/SKILL.md` for the full procedure.

- [<new|existing>] <Entity/Concept name> — `type: <type>` (entity: `entity_type: <value>`) — from <source(s)>
...

## Proposed topic tree

wiki/<existing-or-new-topic>/
├── _index.md                    [new | existing]
├── <page>.md                    [new | update]
├── <subtopic>/                  [new | existing]
│   ├── _index.md                [new | existing]
│   └── <page>.md                [new | update]
...

## Folder size check
- <topic>/: N direct children (target ≤ 12)
- <topic>/<subtopic>/: N direct children (target ≤ 12)

## Graph color groups needed
- <new-top-level-topic> → next palette color
- (or: none)

## Open decisions
- <any ambiguities the model resolved — e.g., "placed X under Y instead of Z because …">
```

The plan must obey `vault/CLAUDE.md` folder-hierarchy rules (max depth 4, grouped by semantic domain, every folder gets `_index.md`) and ingest-specific sizing:

- **Target ≤ 12 pages per folder.** Plan subtopic folders up front if exceeded.
- Entities cluster into `roles/`, `tools/`, or named subtopic folders.
- Deliverables/build items/templates cluster into `deliverables/` or `templates/`.
- Blockers/decisions/project-tracking cluster into `blockers/` or `project/`.
- Process concepts (flows, tiers, triggers) stay in the parent topic folder.

### 1.4b — Confirmation gate

Report to the user:

```
Ingest plan written to vault/output/_pipeline-plan-YYYY-MM-DD.md.

Summary:
- N new sources, M total entities/concepts
- N new folders, N updated folders
- N pages will be created, M pages will be updated
- Graph color groups to add: N

Review the plan. Options:
  (a) Approve — proceed to write pages
  (b) Edit the plan file, then approve — I'll re-read before proceeding
  (c) Abort — no pages will be written
```

**Stop. Wait for explicit approval before continuing.** If the user edits the plan file, re-read it before 1.5. If the user aborts, log the abort to `wiki/log.md` and exit:

```
## [YYYY-MM-DD] ingest-aborted | Plan declined
Plan at vault/output/_pipeline-plan-YYYY-MM-DD.md. N sources left unprocessed.
```

## Step 3 — Optimize (opt-in, destructive)

**This step restructures folders with `git mv` and rewrites `parent:`/`path:` across many pages. It requires explicit user confirmation.**

### 3.1 Audit

Count pages per folder. Identify folders with > 12 direct `.md` children (excluding `_index.md`). If none, skip Step 3 entirely and report "no optimization needed".

### 3.2 Plan and confirm

Write the restructure plan to `vault/output/_restructure-plan-YYYY-MM-DD.md`
(git-ignored; no frontmatter required). Structure:

```
# Restructure plan — YYYY-MM-DD

## Proposed restructure

<folder-a>/ (18 pages) → split into:
  <folder-a>/subtopic-x/  (<count> pages: <list>)
  <folder-a>/subtopic-y/  (<count> pages: <list>)

<folder-b>/ (14 pages) → split into:
  ...

## Summary
- Cross-links to add: N
- Files to move: N (git mv)
- Frontmatter rewrites: N (parent/path fields)
```

Report to the user:

```
Restructure plan written to vault/output/_restructure-plan-YYYY-MM-DD.md.

Options:
  (a) Approve — execute the restructure
  (b) Edit the plan file, then approve — I'll re-read before executing
  (c) Decline — skip Step 3, proceed to Step 4
```

**Stop. Wait for explicit approval before continuing.** If the user edits the plan file, re-read it before 3.3. If the user declines, skip to Step 4.

### 3.3 Execute

Only after explicit confirmation:

1. Create subtopic folders with `_index.md` each.
2. `git mv` each page into the correct subtopic.
3. Update each moved page's `parent:` and `path:`.
4. Update the parent `_index.md`: remove moved children from `children:`, add subfolder entries to `child_indexes:`.
5. Update `wiki/index.md` to reflect new locations.
6. Add obvious `related:` cross-links (pages sharing 2+ sources, pages in the same new subtopic, pages referenced in body text).

### 3.4 One re-run of lint-fix

Invoke the `Task` tool with `subagent_type: claude-wiki-pages-curator-agent` and the
following prompt verbatim:

```
Run a post-restructure lint and fix pass. Pages were moved and new
_index.md files were created. Verify parent/path, children arrays, and
index entries are consistent. This is the final pass.
```

Do not spawn a third run. Unresolved errors go into the final report.

### 3.5 Log

Append to `wiki/log.md`:

```
## [YYYY-MM-DD] optimize | Tree restructure
Moved N pages into subtopic folders. Created N new _index.md files.
Current tree: <summary>.
```

## Final report template

```
## Pipeline complete

### Step 1 — Ingest
- Plan: approved | edited-then-approved | aborted
- Plan file: vault/output/_pipeline-plan-YYYY-MM-DD.md
- Sources processed: N / N unprocessed  (backlog: N, if any)
- Source summaries created: N
- Entity pages created/updated: N / N
- Concept pages created/updated: N / N
- Divergences from plan: N  (list if any)

### Step 2 — Fix
- Issues found / fixed / unresolved: N / N / N

### Step 3 — Optimize
- Status: skipped | declined | executed
- Folders created: N
- Pages moved: N
- Wikilinks added: N

### Step 4 — Synthesize
- Synthesis notes created: N
- Pages scoped: N
- Gaps identified: N

### Current tree
<folder listing with page counts>

### Unresolved
<list anything still failing verify-ingest.sh>
```
