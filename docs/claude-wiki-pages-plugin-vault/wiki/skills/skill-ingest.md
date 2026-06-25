---
title: "Ingest Skill"
type: entity
entity_type: tool
aliases: ["Ingest Skill", "ingest", "/claude-wiki-pages:ingest"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-ingest|Ingest Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "ingest", "provenance"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Ingest Skill

The `ingest` skill processes sources under `vault/raw/` into typed wiki pages, applying the classification checklist, two-pass alias-aware dedup, and additive merge rules on every extraction.

## Overview

`ingest` is the single-responsibility ingest verb — the middle third of what the ingest agent does. The agent wraps this skill with a post-ingest lint-fix pass and optional synthesis step. Invoke the skill directly when the user wants only the ingest portion; invoke the agent for the full cycle.

Invocation triggers: a file exists in `vault/raw/` not yet referenced in `log.md`; user explicitly requests ingest-only.

## Key Facts

**Classification checklist** (every extracted page):
1. Assign exactly one `type` from `ontology-profile-v1`
2. For `type: entity`, assign exactly one `entity_type` from the same profile
3. Out-of-enum items: use the closest legal type; if no mapping exists, flag for human review — never invent out-of-enum values

**Two-pass alias-aware dedup** (I2):
- Pass 1: exact title match (case-insensitive) against existing pages' `title:` fields
- Pass 2: alias-aware match against every existing page's `aliases:` list
- If either pass matches: additive merge (append source to `sources:`, increment `update_count`, advance `updated`, recalculate `confidence`)
- Only create a new typed page when both passes return no match

**Additive merge invariant**: existing `sources:` are never dropped, overwritten, or lost.

**PDF ingest path** (I4): source note requires `source_format: pdf`, `attachment_path: "raw/assets/<file>.pdf"`, and `extracted_at: <YYYY-MM-DD>`. Both `attachment_path` and `extracted_at` are required when `source_format` is not `text`.

**Agent-session sources**: `source_type: agent-session` files from `raw/agent-sessions/` are real raw sources — they go through the same `_proposed/` review gate, never bypassed as `derived: true` pages.

**Wikilink emission rule**: every link targets the destination's file basename in piped form `[[entity-name|Entity Name]]`. Path-qualify only on a genuine vault-wide collision (basename in 2+ files). Never emit a bare `[[Title Case]]` link.

**Completion signal**: `READY: <N> sources ingested, <M> pages written (<C> created, <U> updated).`

## Related

Paired with `[[skill-lint|Lint Skill]]` (post-ingest health check) and `[[skill-ingest-pipeline|Ingest Pipeline Skill]]` (topic-tree plan and parallel-extract contract).
