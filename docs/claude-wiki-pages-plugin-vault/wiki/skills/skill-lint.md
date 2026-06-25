---
title: "Lint Skill"
type: entity
entity_type: tool
aliases: ["Lint Skill", "lint", "/claude-wiki-pages:lint"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-lint|Lint Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "lint", "audit"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Lint Skill

The `lint` skill audits `vault/wiki/` for structural and provenance drift, reporting Errors, Warnings, and Info items. Read-only — repairs belong to the fix skill.

## Overview

Lint is the first half of the lint-fix cycle that the curator agent orchestrates. It checks every rule enumerated in `vault/CLAUDE.md`.

Invocation triggers: user requests a health check; periodic audit every 10 ingests or monthly; as the first step of a curator heal pass.

## Key Facts

**Errors** (block usability):
- Missing required frontmatter for the page's `type:`
- Dangling wikilinks (`[[Target]]` with no matching file or alias)
- Plain-string `sources:` entries not in `[[wikilink]]` form
- Missing `parent` or `path` on any non-root page
- MOC missing members (page exists in folder but not in folder note's `children:`)
- Banned legacy values (`type: moc`, `_MOC.md` references, `child_mocs:` field)
- Missing `sources` on `entity`, `concept`, `topic`, `project`, or `synthesis` pages

**Warnings** (structural drift):
- Contradictions between pages on the same entity
- Orphan pages (no inbound wikilinks)
- Single-source high confidence (`confidence ≥ 0.8` with only one `sources:` entry)
- Vault MOC drift (index.md lists non-existent pages or omits existing ones)
- MOC missing aliases on folder notes
- Legacy index filename (`_index.md` instead of `<folder>/<folder>.md`)
- Excessive nesting (folder more than 4 levels deep)
- Derived high confidence (`derived: true` + `confidence ≥ 0.8`)

**Opt-in WARN checks** (run separately, not always-on):
- S1: predicate domain→range conformance (`lint-ontology.sh`)
- S2: template-skeleton conformance + no-raw-HTML (`lint-structural.sh`)
- S3: controlled-vocabulary freshness (`lint-vocabulary.sh`)

**Two staleness mechanisms**: S4 source-relative staleness (WARN, per-source date comparison) and 30-day calendar staleness (Info). Agent-session memories use the same two mechanisms — no separate memory-specific system.

**Exit codes**: 0 = zero errors and warnings; 1 = warnings, no errors; 2 = errors present.

## Related

Pairs with `[[skill-fix|Fix Skill]]` (applies the repairs lint identifies).
