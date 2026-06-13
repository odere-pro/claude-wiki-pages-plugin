---
title: "Lint Rules"
type: concept
aliases: ["Lint Rules", "lint rules", "linting", "vault lint", "audit rules"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[Architecture Documentation]]", "[[User Guide 04: Review Validate Fix]]", "[[ADR-0014: Single-Source Required Fields]]"]
related: ["[[Curator Agent]]", "[[Auto-Heal]]", "[[Git Checkpoint]]", "[[Schema Authority]]", "[[Deterministic Engine]]"]
tags: ["concept", "lint", "quality"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Lint Rules

> [!summary]
> Lint rules are the structural and provenance checks the [[Curator Agent]] performs on the wiki, supplemented by the `verify-ingest.sh` script and the [[Deterministic Engine]]'s `verify` verb. Findings are classified as Errors (must fix), Warnings (should fix), or Info (consider addressing). Most mechanical findings are auto-healed by the engine or the curator; judgment findings (restructures, merges) require the curator's explicit pass. Every auto-heal change lands in a revertible git commit.

## Purpose

Lint rules exist because the wiki has structural invariants that individual writes cannot self-enforce. A broken wikilink might be introduced on the last write of a long agent run. An orphan page might emerge when its only referring page is rewritten. A folder note's `children` list drifts whenever a page is moved without updating the note. Lint catches the accumulated drift that builds up between ingest runs.

The recommended schedule: **after every 10 ingests or monthly** — whichever comes first.

## Running Lint

```bash
# Full structural verification
bash scripts/engine.sh verify --target <vault> --json

# Heal structural errors (creates git checkpoint, then fixes)
bash scripts/engine.sh heal --target <vault> --json

# Shell-only verification (no Bun required)
bash scripts/verify-ingest.sh <vault>
```

The curator agent runs `engine heal` as its first step, then augments with the supplemental checks below.

## Errors (Must Fix)

| Check | Description |
| --- | --- |
| Broken wikilinks | wikilinks to pages that do not exist as files or aliases |
| Missing required frontmatter | Any required field absent for the page's `type` (from the `### Required fields by type` table in `CLAUDE.md`) |
| Title collisions | Two pages with identical `title` values (Obsidian graph collapses them) |
| Index lists non-existent page | A folder note's `children` contains a wikilink to a page file that does not exist on disk |
| Topic folder missing folder note | A `wiki/<topic>/` directory with no `<topic>.md` file |

Errors block correct operation of the wiki. They are auto-repaired by `engine heal` where deterministic (index entries for missing pages, missing folder notes). Title collisions and broken wikilinks with no fuzzy match are surfaced as Report items for human resolution.

## Warnings (Should Fix)

| Check | Description |
| --- | --- |
| Orphan pages | Pages with no inbound wikilinks from other pages |
| Plain-string sources | `sources: ["architecture.md"]` instead of `sources: ["[[Architecture Documentation]]"]` |
| Missing `parent` / `path` | Required on all non-root pages; missing fields break graph navigation |
| Index drift | Page exists on disk but is not listed in its folder note's `children` |
| Legacy `_index.md` filename | Schema_version 3 requires folder-note naming; remediation: `engine migrate --write` |
| Flat folder sprawl | A topic folder with more than 12 direct children (signal to create subtopics) |
| Excessive nesting | Folder depth greater than 4 levels |
| `child_indexes` drift | A sub-folder exists but is not listed in the parent folder note's `child_indexes` |
| Title missing from `aliases` | Ghost-node prevention: `title` must be the first `aliases` entry |
| Missing graph color group | A top-level topic folder with no color group in `.obsidian/graph.json` |
| High-confidence single-source | `confidence ≥ 0.8` but only one entry in `sources:` (over-claiming certainty) |

Warnings are auto-healed by the curator's Phase 2 (mechanical fixes) or Phase 3 (judgment fixes). The exception: `type: source` orphans are Report-only because connecting them would forge provenance.

## Info (Consider Addressing)

| Check | Description |
| --- | --- |
| Stale confidence | `confidence` not updated despite newer related sources existing |
| Body text mentions entity without wikilink | A concept is mentioned in prose but not linked to its page |
| Ghost wikilinks in `log.md` | `log.md` body contains dangling wikilinks to old/invalid patterns (use backtick code format instead) |

Info items are surfaced for awareness; they do not require immediate action but represent technical debt.

## Required Fields by Type (ADR-0014)

The `### Required fields by type` table in `vault/CLAUDE.md` is the single source of truth for which fields are required per page type. `scripts/validate-frontmatter.sh` parses this table at write time (grep/awk only, no Bun dependency).

| Type | Required fields |
| --- | --- |
| `source` | `source_type sources created updated status confidence` |
| `entity` | `entity_type parent path sources created updated status confidence` |
| `concept` | `parent path sources created updated status confidence` |
| `topic` | `summary parent path sources created updated status confidence` |
| `project` | `objective project_status parent path sources created updated status confidence` |
| `synthesis` | `synthesis_type sources created updated status confidence` |
| `index` | `aliases created updated` |
| `manifest` | `created updated` |
| `log` | `created updated` |

A missing required field on a Write/Edit fires the `validate-frontmatter.sh` PreToolUse hook (exit 2), blocking the write before it reaches the filesystem.

## Auto-Healed vs Judgment Fixes

The engine and curator auto-heal mechanical fixes:
- Plain-string sources → wrapped in wikilink syntax
- Missing `parent`/`path` → filled from folder structure
- Missing `title` from `aliases` → appended
- `children` drift → appended (never deleted)
- Missing folder notes → created
- Missing graph color groups → applied
- Ghost wikilinks in `log.md` → replaced with backtick format

Judgment fixes applied automatically by the curator under the git checkpoint:
- Flat folder restructuring (>12 children → subtopic groups)
- Title-collision renames
- Body wikilink densification
- Near-duplicate page merges

Report-only (human editorial decision required):
- `type: source` orphan pages (connecting them would forge provenance)
- Broken wikilinks with no fuzzy match
- Ambiguous near-duplicate merges

## Confidence Calibration Rules

Lint flags two confidence issues:
1. **Low confidence** (`confidence < 0.5`): page should be reviewed or removed.
2. **High-confidence single-source** (`confidence ≥ 0.8`, one `sources:` entry): the confidence claim is not supported by the evidence (multiple sources are needed for `0.8`).

The calibration rules from `vault/CLAUDE.md`:
- `1.0` — direct quotes or settled facts from authoritative source
- `0.8` — at least two independent sources corroborate
- `0.6` — single-source internal-policy claims
- `< 0.5` — inference not supported by explicit source text

## Related

- [[Curator Agent]] — the agent that runs these checks and applies auto-heals
- [[Deterministic Engine]] — the `verify` and `heal` verbs that implement structural checks
- [[Auto-Heal]] — the mechanical fixes applied without approval
- [[Schema Authority]] — `CLAUDE.md` defines the required fields per type
- [[Git Checkpoint]] — every auto-heal change lands in a revertible commit
