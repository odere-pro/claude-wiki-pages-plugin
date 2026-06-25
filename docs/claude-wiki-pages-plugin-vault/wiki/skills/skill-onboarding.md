---
title: "Onboarding Skill"
type: entity
entity_type: tool
aliases: ["Onboarding Skill", "onboarding", "/claude-wiki-pages:onboarding", "guided first run"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-onboarding|Onboarding Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "onboarding", "first-run"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Onboarding Skill

The `onboarding` skill guides a brand-new user from "just installed the plugin" to a working, queryable wiki in five steps, resuming from wherever the vault already is if re-run.

## Overview

Idempotent — probes state first, skips steps already done. The guided tour covers health check → scaffold vault → add a first source → ingest → ask a question.

Invocation triggers: "get started", "onboard me", "set this up", "first time", `/claude-wiki-pages:onboarding`.

## Key Facts

**Four principles**:
1. One step at a time — do a step, show the result, say what is next; never dump the whole pipeline
2. Resume, don't restart — probe state first, skip completed steps
3. Self-healing — ingest runs the git-checkpointed auto-heal; never ask the user to fix structure by hand
4. Plain language — the user does not need to know "MOC" or "frontmatter" to finish onboarding

**Five steps**:
1. Health check: run `/claude-wiki-pages:doctor`; if anything is red, run with `--fix` and explain
2. Scaffold: if no vault exists, run `init`; tell the user where it is and that `raw/` is for their sources
3. Add a first source: the bundled `sample-source.md` is pre-seeded by the scaffold; ask whether the user wants their own file instead or alongside it
4. Ingest: run `/claude-wiki-pages:wiki`; explain that auto-heal runs under a git checkpoint
5. Ask a question: run `/claude-wiki-pages:query`; show the answer with wikilink citations

**Closing map** (what you can do next): ingest more sources via `/claude-wiki-pages:wiki`; query via `/claude-wiki-pages:query`; rollback via `git log`; health check via `/claude-wiki-pages:doctor`; engine API via `/claude-wiki-pages:engine-api`; offline local-model drafting (opt-in, never unprompted).

## Related

Pairs with `[[skill-init|Init Skill]]` (step 2 of the tour) and the onboarding agent (executes this skill).
