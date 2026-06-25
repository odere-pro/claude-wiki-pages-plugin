---
title: "Draft Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "draft"]
aliases: ["Draft Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Draft Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/draft/SKILL.md`
- Type: Skill definition for the `draft` verb

## Summary

The `draft` skill uses a local model (Ollama/LM Studio) to produce candidate wiki pages into `vault/_proposed/` for human review, when `localModel.enabled` is true. Off by default — never auto-fires. Pairs with `/claude-wiki-pages:review` to promote drafts.

## Key Claims

Covers: Draft Skill, Local Model Config, Capability Tiers, Local-Ingest Stub, Nested Tag Taxonomy, Proposed-By Contract.

Only the `ingest-extract` tier is unlocked today (with `qwen3-coder:30b`). Gate-approved models only — the engine's `APPROVED_LOCAL_MODELS` list governs; an unproven model exits 1 with a non-empty `localModelErrors`. For true-offline drafting, `bash scripts/offline-draft.sh` applies the same gates and writes to `_proposed/`. Drafts stamp `proposed_by: "<provider>:<model>"` and `status: draft`; `proposed_by` is dropped on promotion. Never writes `wiki/` directly.
