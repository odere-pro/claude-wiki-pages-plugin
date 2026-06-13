---
title: "Lint Rules"
type: concept
aliases: ["Lint Rules", "lint rules", "linting", "vault lint", "audit rules"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[Architecture Documentation]]", "[[User Guide 04: Review, Validate, Fix]]", "[[ADR-0014: Single-Source Required Fields]]"]
related: ["[[Curator Agent]]", "[[Auto-Heal]]", "[[Git Checkpoint]]", "[[Schema Authority]]"]
tags: ["concept", "lint", "quality"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Lint Rules

## Definition

Lint rules are the structural and provenance checks the [[Curator Agent]] performs on the wiki. Lint findings are reported as Errors, Warnings, and Info items. Most mechanical findings are auto-healed; judgment findings require a plan.

## Key Principles

The full lint rule set (from `vault/CLAUDE.md`):

- **Orphan pages** — no inbound wikilinks.
- **Dangling links** — wikilinks to non-existent pages.
- **Stale pages** — not updated in 30+ days despite newer related sources existing.
- **Contradictions** — between pages on the same topic.
- **Missing pages** — concepts mentioned in prose but lacking their own page.
- **Missing frontmatter fields** — every required field must be present (per the required-fields table).
- **Low confidence** — `confidence` below 0.5 (flag for review or removal).
- **Index consistency** — every note in a folder is listed in its folder note; every folder note links to its parent index.
- **Index aliases** — every folder note must have `aliases` reflecting the topic.
- **Legacy index filename** — `_index.md` in a schema_version 3 vault (remediation: `migrate --write`).
- **Plain-string hierarchy links** — `parent`/`children`/`child_indexes` values not quoted as `"[[wikilink]]"`s.
- **Missing parent/path** — notes with missing or incorrect `parent`/`path` fields.
- **Excessive nesting** — folders deeper than four levels.

## Examples

- A page with `sources: ["architecture.md"]` (plain string) → lint error: sources must be `["[[Architecture Documentation]]"]`.
- A folder note missing `aliases:` → lint warning: `index-aliases` finding.

## Related Concepts

- [[Curator Agent]] — the agent that runs these checks and applies auto-heals
- [[Auto-Heal]] — the mechanical fixes applied without approval
- [[Schema Authority]] — `CLAUDE.md` that defines the required fields
- [[Git Checkpoint]] — every auto-heal change is reversible
