---
title: "Ingest Pipeline"
type: concept
aliases: ["Ingest Pipeline", "ingest pipeline", "ingest workflow", "13-step ingest"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[Architecture Documentation]]", "[[User Guide 02: Create a New Vault]]", "[[User Guide 03: Update Existing Vault]]", "[[ADR-0001: Four-Layer Orchestrator]]", "[[Wiki Pages Skill (maintain-contract SKILL.md)]]"]
related: ["[[Ingest Agent]]", "[[Entity Distribution Model]]", "[[Git Checkpoint]]", "[[Folder Note]]", "[[Auto-Heal]]", "[[Schema Authority]]", "[[Maintain Contract]]"]
tags: ["concept", "ingest", "workflow"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# Ingest Pipeline

> [!summary]
> The ingest pipeline is the 13-step process that transforms raw source files from `vault/raw/` into structured, provenance-tracked wiki pages in `vault/wiki/`. It is governed by the ingest rules in `vault/CLAUDE.md`. The core principle is the [[Entity Distribution Model]]: one source rewrites many existing pages rather than creating one summary. Every touched page receives an updated `sources`, incremented `update_count`, refreshed `updated` date, and recalibrated `confidence`. The pipeline is git-checkpointed at both ends and verified by the `subagent-ingest-gate.sh` hook on completion.

## Purpose

Raw sources are the evidence base of the wiki. The ingest pipeline is the mechanism by which evidence becomes structured, wikilinked, provenance-tracked knowledge. The pipeline is not a document summarizer — it is a knowledge base maintainer. It updates existing pages, creates new ones only when genuinely new entities or concepts are encountered, and always traces every claim back to a specific source.

## Pre-Conditions

Before the pipeline starts:
- The user has placed source files (markdown documents, PDFs, notes) in `vault/raw/`.
- `vault/CLAUDE.md` has been read — the pipeline follows its ingest rules, not the skill's simpler defaults.
- A pre-snapshot git checkpoint is in place.

## The 13 Steps

### Step 1 — Source Summary

Create `wiki/_sources/<slug>.md` with `type: source` frontmatter. This is the provenance anchor: every entity/concept page that draws on this source will link to this summary. Fields set: `title`, `source_type`, `url` (if applicable), `author`, `publisher`, `date_published`, `date_ingested`, `status: active`, `confidence: 1.0`.

Source pages do not belong to a topic folder — they live under `wiki/_sources/` and are listed separately in `wiki/index.md`.

### Step 2 — Extract Entities and Concepts

Read the source and identify all entities (concrete things: people, organizations, products, tools, services, standards, places) and concepts (abstract ideas: frameworks, theories, patterns, principles). This is the LLM's primary classification step.

I1 classification uses the `entity_type` enum and `type` enum from [[Ontology Profile v1]]. Entities get `type: entity` with an appropriate `entity_type`. Concepts get `type: concept`.

### Step 3 — Assign to Topic Folders

For each extracted item, determine which topic folder it belongs to. If the topic folder does not exist:
- Create `wiki/<topic>/` directory.
- Create `wiki/<topic>/<topic>.md` — the [[Folder Note]] — with `type: index`, correct `aliases`, `parent`, `path`, `children: []`, `child_indexes: []`.

If the topic folder already exists, proceed without creating a new folder note.

### Step 4 — Search for Existing Pages

Search `wiki/<topic>/` for an existing page on each extracted entity/concept. Match by:
- Filename (kebab-case of the entity/concept name)
- `title` field
- `aliases` field

A match means the page already tracks this entity/concept. A miss means it is genuinely new.

### Step 5 — Update Existing Pages (Entity Distribution Model)

**For existing pages:** update rather than create. The [[Entity Distribution Model]] is the DRY rule: one source rewrites many existing pages. Merge the new information into the existing page — add new facts, update sections, expand examples — while preserving the page's structure and all previously established facts.

Do not create a duplicate page for an entity or concept that already has a page. The ingest pipeline has one canonical place for each entity: the existing page.

### Step 6 — Create New Pages

**For genuinely new entities/concepts:** create a new page under the appropriate topic folder. Use the template from `_templates/<type>.md` for both frontmatter and body structure. The body template provides the section skeleton (e.g., concept → `## Definition`, `## Key Principles`, `## Examples`, `## Related Concepts`). Do not invent section headings not in the template — the structural lint flags missing template sections as `missing-section`.

Set:
- `parent: "[[FolderNoteTitle]]"` — wikilink to the topic folder note.
- `path: "<topic>"` — relative path from `wiki/`.
- `created:` today's date.

### Step 7 — Update `sources:` Frontmatter

On every page touched (existing or new), add the new source as `"[[Source Title]]"` to the `sources:` list. Always use wikilink syntax — never plain strings. The `check-wikilinks.sh` hook blocks plain strings as a lint error.

### Step 8 — Increment `update_count`

On every page touched, increment `update_count` by 1. High `update_count` = well-evidenced by multiple sources. Low `update_count` = peripheral, candidate for review.

### Step 9 — Update `updated` Date

On every page touched, set `updated:` to today's date in `YYYY-MM-DD` format.

### Step 10 — Update `confidence`

Recalibrate `confidence` based on the new source:
- **Confirming:** the new source corroborates existing claims → increase confidence (up to 1.0 maximum, but never use 1.0 unless all claims are directly quoted facts from authoritative sources).
- **Contradicting:** the new source presents conflicting information → decrease confidence. Record the contradiction in the page body.
- **New information:** if the source adds information not previously on the page, keep confidence unchanged (neither confirming nor contradicting existing claims).

See the confidence calibration rules in `vault/CLAUDE.md` (§ Readability): 1.0 for direct quotes, 0.8 for two independent confirming sources, 0.6 for single-source internal policy, <0.5 for inference.

### Step 11 — Update Folder Notes

For every topic folder that received a new page (step 6): add the new page to the folder note's `children` list as `"[[PageTitle]]"`. For every new sub-folder created: add its folder note to the parent folder note's `child_indexes` list as `"[[SubFolderTitle]]"`.

All values must be quoted `"[[wikilink]]"` syntax. The [[Polish Agent]] reconciles any drift after the pipeline completes.

### Step 12 — Update `wiki/index.md`

Add entries for any new pages to `wiki/index.md` (the vault MOC). If a new topic folder was created, add a section for it. The polish agent regenerates the full index with current page counts after the pipeline.

### Step 13 — Append to `wiki/log.md`

```markdown
## [YYYY-MM-DD] ingest | Source Title
```

This log entry is what the [[Orchestrator Agent]] checks to determine whether a raw source has been processed. The log entry's presence is the idempotency key — re-running ingest on an already-processed source is detected by comparing `raw/` filenames to log entries.

## Error Conditions

| Condition | What happens |
| --- | --- |
| `check-wikilinks.sh` finds a broken `[[link]]` in the new page | Write is blocked (PreToolUse exit 2) |
| `validate-frontmatter.sh` finds missing required field | Write is blocked |
| Source summary already exists (re-ingest) | Orchestrator skips (log entry present) |
| Folder note missing after step 3 | `engine heal` creates it on next verify |

## What "Done" Looks Like

After a successful ingest:
1. `wiki/_sources/<slug>.md` exists with correct frontmatter.
2. All extracted entities/concepts have pages in the correct topic folders.
3. Every touched page has the new source in `sources:`, incremented `update_count`, updated `updated` date.
4. All touched folder notes have the new pages in `children`.
5. `wiki/index.md` includes the new pages.
6. `wiki/log.md` has a new `## [YYYY-MM-DD] ingest | Source Title` entry.
7. `engine verify` reports 0 errors and 0 warnings.
8. The post-snapshot commit is present in git history.

## Related

- [[Ingest Agent]] — the agent that executes this pipeline
- [[Entity Distribution Model]] — the DRY update-not-duplicate rule (step 5)
- [[Git Checkpoint]] — snapshot pre/post wraps the pipeline
- [[Folder Note]] — created for every new topic folder (step 3) and updated at step 11
- [[Schema Authority]] — `CLAUDE.md` that governs every step
- [[Auto-Heal]] — the curator's follow-on pass that fixes any structural issues the pipeline left
