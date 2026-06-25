---
title: "Draft Skill"
type: entity
entity_type: tool
aliases: ["Draft Skill", "draft", "/claude-wiki-pages:draft", "local model draft"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-draft|Draft Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "draft", "local-model"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Draft Skill

The `draft` skill uses a local model (Ollama/LM Studio) to produce candidate wiki pages into `vault/_proposed/` for human review — off by default, never auto-fires.

## Overview

Optional, private, free drafting. When `localModel.enabled` is true, this skill reads sources from `raw/`, prompts the configured local model to produce candidate pages following the vault schema, writes each candidate to `_proposed/` (stamping `proposed_by` and `status: draft`), and stops. Promotion is the reviewer's job via `propose approve`.

Invocation triggers: user explicitly wants local/offline/private drafting; `localModel.enabled` is true and an ingest should go through the draft path.

## Key Facts

**Capability tiers** (ADR-0018 gate-approved models only):
- Only `ingest-extract` tier is unlocked today with `qwen3-coder:30b`
- `tier: "draft"` is wired but BLOCKED until a model clears its quality gate
- `offlinePolicy` governs Claude→local fallback: `off` (default), `prefer-local`, `strict`

**Gate enforcement**: `localModelErrors` must be empty before drafting. If non-empty, STOP and surface the message. Do not draft with an unapproved model.

**Local-ingest stub** (Pc): scoped exclusively to `ingest-extract` tier. Writes only to `_proposed/`, never `wiki/`. Output path: `_proposed/wiki/<topic>/<page>.md`. Uses the one `_proposed/` write channel — no second channel.

**Nested tag taxonomy** (ADR-0036): when drafting pages for structured knowledge domains, populate `tags:` with slash-nested taxonomy tags: `family/<value>`, `severity/<value>`, `principle/<value>`. Do not add `[[wikilinks]]` to pages in other topic trees — use `topic/<tree>` tags for cross-tree associations.

**True-offline drafting**: `bash scripts/offline-draft.sh` applies the same gates and writes the same `_proposed/` drafts from a plain shell (no Claude Code running).

## Related

Pairs with `[[skill-review|Review Skill]]` (the promotion gate for produced drafts).
