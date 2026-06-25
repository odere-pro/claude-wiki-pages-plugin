---
title: "Curator Fixes Skill"
type: entity
entity_type: tool
aliases: ["Curator Fixes Skill", "curator-fixes", "/claude-wiki-pages:curator-fixes", "curator check catalog"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-curator-fixes|Curator Fixes Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "curator-fixes", "curator"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Curator Fixes Skill

The `curator-fixes` skill documents the supplemental diagnostic checks, nine safe auto-fixes, and automatic judgment-fix procedure for the curator agent — reference material the agent reads during Phase 1 (diagnose) and Phases 3–4 (apply).

## Overview

Reference material, not an action. Schema authority remains `vault/CLAUDE.md`; the engine-heal preflight, severity classification, re-verify, report, and hard rules live in the agent body.

## Key Facts

**Supplemental checks** (Phase 1.2 — not covered by the script; run via Grep/Glob):
- Broken wikilinks, orphan pages, title collisions, title missing from `aliases`
- Missing graph color groups for top-level topic folders
- Flat folder sprawl (>12 direct `.md` children)
- Excessive nesting (>4 levels from `wiki/`)
- Stale confidence (`confidence < 0.5` and `updated` > 30 days ago)
- High confidence with single source (`confidence ≥ 0.8` and only one `sources:` entry)
- Ghost wikilinks in `log.md`

**Nine Phase 3 auto-fixes** (each idempotent and content-preserving):
1. Wrap plain-string `sources:` in wikilinks
2. Fill missing `parent:` / `path:`
3. Add `title` to `aliases` (ghost-node prevention)
4. Repair folder-note children drift (add missing, remove stale, populate `child_indexes:`)
5. Repair `wiki/index.md`
6. Clean ghost wikilinks in `log.md`
7. Resolve broken and ghost wikilinks — always rewrite to piped basename form `[[file-basename|Display]]`
8. Connect orphan pages (link to folder note; add to sibling `related:` only when 2+ shared sources)
9. Auto-delete nothing — no auto-deletion of any page, including stale agent-session sources

**Ghost wikilink resolution rule**: a `wikilink-ghost` finding names the file it resolves to; rewrite to that file's basename in piped form, preserving existing display text.

**Stale agent-session memories**: handled via standard `status: stale` + `confidence` decay — no memory-specific deletion path, no separate staleness field, no parallel staleness mechanism.

## Related

Implemented by the curator agent, which reads this skill alongside `[[skill-lint|Lint Skill]]` findings.
