---
title: "LLM Wiki — Review, Validate, and Fix"
type: concept
aliases: ["llm-wiki-review-validate", "LLM Wiki Review Validate", "lint validate fix guide"]
parent: "[[llm-wiki|LLM Wiki Guides]]"
path: "guides/llm-wiki"
sources: ["[[docs-llm-wiki-04|LLM Wiki Guide 04 — Review, Validate, and Fix]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "llm-wiki", "user-guides", "curator"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# LLM Wiki — Review, Validate, and Fix

The lint, validate, and fix cycle: running the doctor for a health check, reviewing `_proposed/` drafts, and triggering the curator for automatic structural self-heal.

## Definition

"Review, validate, and fix" covers three activities: health checking (finding problems), draft review (approving or rejecting staged content), and self-heal (automatically fixing structural issues that do not require editorial judgment).

## Key Principles

**Health check.** `/claude-wiki-pages:doctor` runs `verify-ingest.sh --target <vault>` and reports errors (schema violations), warnings (dangling links, orphans), and info items (stale pages). The doctor is a read-only operation — it never writes.

**Draft review.** Local models and agents write drafts to `_proposed/` (never directly to `wiki/`). The review skill (`/claude-wiki-pages:review`) presents each draft and lets the human approve (promotes to `wiki/` under a git checkpoint) or reject (leaves in `_proposed/`). No agent self-approval.

**Structural self-heal.** The curator agent runs automatically after every ingest. It can also be invoked directly. The heal sequence: `engine.sh heal` (deterministic, git-checkpointed — fixes structural errors: missing frontmatter, broken index entries, orphan connections), then judgment fixes (wikilink repair, parent correction). Every fix lands as a separate, revertible git commit.

**Two problem classes.** Structural errors: schema violations blocked by the PreToolUse validators. Quality warnings: dangling links, orphans, stale pages — not blocked at write time, surfaced by doctor and lint.

**Lint schedule.** Recommended: every 10 ingests or monthly. Running `/claude-wiki-pages:doctor` at any time is always safe.

## Examples

After a bulk ingest, the doctor might report 5 dangling wikilinks. Running the curator (or `/claude-wiki-pages:wiki` which triggers it) will automatically repair the ones that can be fixed deterministically, and leave the rest as warnings for editorial attention.

## Related Concepts

The curator agent's heal sequence is specified in the curator agent contract. ADR-0012 defines the merge conflict resolution policy that the curator applies during heal.
