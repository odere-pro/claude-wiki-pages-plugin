---
title: "Ingest Pipeline Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "ingest-pipeline"]
aliases: ["Ingest Pipeline Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Ingest Pipeline Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/ingest-pipeline/SKILL.md`
- Type: Skill definition for the `ingest-pipeline` reference skill

## Summary

The `ingest-pipeline` skill documents the Step 1.4 topic-tree plan format and confirmation gate, the Step 3 optimize (destructive restructure) procedure, the parallel-extract EXTRACT envelope contract, and the final-report template for the ingest agent. Reference material — not an action.

## Key Claims

Covers: Ingest Pipeline Skill, Topic-Tree Plan Format, Confirmation Gate, EXTRACT Envelope, Single-Writer Dedup, Cross-Envelope Coalesce, Final Report Template.

The Step 1.4 plan is written to `vault/output/_pipeline-plan-YYYY-MM-DD.md` (git-ignored). The confirmation gate offers three options: approve, edit-then-approve, abort. On abort, a clean `ingest-aborted` log entry is written. The EXTRACT envelope contract specifies `source_path`, `items[]` (with `slug_candidate`, `type`, `entity_type`, `title`, `summary`, `source_quotes[]`, `confidence`, `derived`, `out_of_enum`), `predicates[]`, `implied_folders[]`, `source_note`, and `error`. Single-writer dedup coalescifies multi-source proposals: union `sources`, union `related`, `max()` confidence, `derived: true` only if all contributors are derived.
