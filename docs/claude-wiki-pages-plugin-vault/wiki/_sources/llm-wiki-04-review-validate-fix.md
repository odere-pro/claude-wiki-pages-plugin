---
title: "User Guide 04: Review Validate Fix"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["guide", "lint", "curator", "validation"]
aliases: ["User Guide 04: Review Validate Fix", "User Guide 04: Review, Validate, Fix"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# User Guide 04: Review, Validate, Fix

## Summary

Three validation levels: status (quick health), lint (read-only audit), curator agent (full repair). Recommended cadence: every 10 ingests or monthly.

## Key Claims

- Three levels: (1) `/claude-wiki-pages:status` — quick one-command health; (2) `/claude-wiki-pages:lint` — read-only audit reporting errors/warnings/info; (3) `/claude-wiki-pages:claude-wiki-pages-curator-agent` — full repair with git checkpoint.
- The curator auto-heals mechanical issues (broken wikilinks, missing frontmatter, orphan pages); judgment fixes (restructures, merges) require a plan.
- Recommended cadence: every 10 ingests, or monthly.
- The curator's engine loop bounds the work; `git revert` is the rollback path.

## Entities Mentioned

- [[Curator Agent]]

## Concepts Covered

- [[Lint Rules]]
- [[Git Checkpoint]]
- [[Auto-Heal]]

## Grounded Pages

Wiki pages that cite this source:

- [[Curator Agent]] — the repair agent
- [[Auto-Heal]] — three validation levels
- [[Lint Rules]] — what lint checks beyond status
