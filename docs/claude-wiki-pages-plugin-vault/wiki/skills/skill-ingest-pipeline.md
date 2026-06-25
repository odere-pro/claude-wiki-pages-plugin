---
title: "Ingest Pipeline Skill"
type: entity
entity_type: tool
aliases: ["Ingest Pipeline Skill", "ingest-pipeline", "/claude-wiki-pages:ingest-pipeline", "pipeline plan", "topic tree plan"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-ingest-pipeline|Ingest Pipeline Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "ingest-pipeline", "topic-tree"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Ingest Pipeline Skill

The `ingest-pipeline` skill documents the Step 1.4 topic-tree plan format and confirmation gate, the Step 3 optimize procedure, and the EXTRACT envelope contract for the ingest agent — reference material, not an action.

## Overview

The ingest agent reads this skill at Step 1.4 (before writing the topic-tree plan), at Step 3 (before running the destructive restructure), and when composing the final report. Schema authority remains `vault/CLAUDE.md`.

## Key Facts

**Step 1.4 plan format** (written to `vault/output/_pipeline-plan-YYYY-MM-DD.md`, git-ignored):
- Sources in this run (N entities, M concepts each)
- Entities and concepts extracted (with classification and dedup verdict: `new` or `existing`)
- Proposed topic tree (with `[new | existing]` and `[new | update]` markers)
- Folder size check (target ≤ 12 direct children per folder)
- Graph color groups needed for new top-level topics
- Open decisions (placement choices, ambiguities)

**Step 1.4 confirmation gate** (stop and wait for explicit approval):
- Option (a): Approve — proceed to write pages
- Option (b): Edit the plan file, then approve — re-read before 1.5
- Option (c): Abort — log `ingest-aborted` entry, exit

**EXTRACT envelope contract** (parallel-extract fan-out):
Fields: `source_path`, `items[]` (`slug_candidate`, `type`, `entity_type`, `title`, `summary`, `source_quotes[]`, `confidence`, `derived`, `out_of_enum: true` + `review_reason` when no legal type fits), `predicates[]`, `implied_folders[]`, `source_note`, `error`.

**Single-writer coalesce** (across multiple envelopes proposing the same entity):
- Union `sources` and `related`
- `max()` confidence
- `derived: true` only if all contributors are derived
- Stable sort by canonical title → byte-identical output regardless of envelope arrival order

**Folder sizing rules**: target ≤ 12 pages per folder; entities cluster into `roles/`, `tools/`, or named subtopic folders; process concepts stay in parent topic folder; max depth 4 levels.

## Related

Used by the ingest agent (`[[skill-ingest|Ingest Skill]]` for the page-write step) and the optimize step which runs `git mv` and rewrites `parent:`/`path:` across many pages.
