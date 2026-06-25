---
title: "Review Skill"
type: entity
entity_type: tool
aliases: ["Review Skill", "review", "/claude-wiki-pages:review", "draft review", "propose"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-review|Review Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "review", "proposed-gate"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Review Skill

The `review` skill is the human-in-the-loop gate for drafted wiki pages, operating on `vault/_proposed/` — nothing reaches the wiki until a human approves here.

## Overview

Drafts land in `vault/_proposed/wiki/<topic>/<page>.md`, mirroring their eventual wiki path. The `_proposed/` directory is a sibling of `wiki/`, so drafts are outside every wiki-scoped check until promotion. There is exactly one `_proposed/` channel — no second draft mechanism.

Invocation triggers: user asks to review/approve/reject drafted pages; a local-model `draft` run has produced proposals; orchestrator detected pending drafts in `_proposed/`.

## Key Facts

**Draft frontmatter**: every draft carries `status: draft` and `proposed_by: "<provider>:<model>"`. Both are dropped on promotion.

**Promotion via `propose approve`**:
1. Moves file from `_proposed/wiki/…` to `wiki/…`
2. Sets `status: active`
3. Drops `proposed_by`
4. Stamps `updated` with today's date
5. Commits under a git checkpoint → rollback via `git revert <sha>`

**Rejection via `propose reject`**: deletes the draft under a git checkpoint; reversible via `git revert <sha>`.

**Duplicate-claim check** (P2.4 — advisory WARN only, exit 0, never blocks):
- Runs `check-duplicate-claims.sh` before presenting the draft
- Normalized comparison: strip YAML quoting → ASCII lowercase → collapse whitespace → trim → remove fixed punctuation class
- Two quotes are duplicates iff normalized strings are byte-identical; a paraphrase does not match

**Engine commands**:
- `engine.sh propose review --target <vault> --json` — list pending drafts with readiness
- `engine.sh propose approve --target <vault> --file <path> --json` — promote
- `engine.sh propose reject --target <vault> --file <path> --json` — delete

**After approval**: chain curator heal + polish — `propose approve` returns `next: "curator heal + polish"` as a reminder.

## Related

Pairs with `[[skill-draft|Draft Skill]]` (produces the drafts) and the curator agent (runs after promotion to heal and index).
