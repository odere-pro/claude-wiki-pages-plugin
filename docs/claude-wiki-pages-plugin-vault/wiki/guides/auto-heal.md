---
title: "Auto-Heal"
type: concept
aliases: ["Auto-Heal", "auto-heal", "automatic repair", "self-heal"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[User Guide 04: Review, Validate, Fix]]", "[[Architecture Documentation]]"]
related: ["[[Curator Agent]]", "[[Lint Rules]]", "[[Git Checkpoint]]"]
tags: ["concept", "curator", "repair"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Auto-Heal

## Definition

Auto-heal is the mechanical fix step of the [[Curator Agent]]. It applies safe structural repairs without user approval, because safety is git revert. Judgment fixes (restructures, merges, large folder reorganizations) require a written plan and user confirmation.

## Key Principles

- **Automatic (no approval needed):** broken wikilink targets, missing required frontmatter fields, orphan pages (add to parent folder note), plain-string `sources` (convert to `[[wikilinks]]`), missing `parent`/`path` values.
- **Judgment fixes (approval required):** restructuring folders, merging duplicate pages, splitting oversized folders.
- **Engine runs first:** `engine.sh heal` runs deterministic structural fixes under a git checkpoint before judgment fixes.
- **Retry cap:** at most two curator sub-agent runs per pipeline (initial + one re-run after restructure). No recursion.
- **Rollback:** `git revert <sha>` undoes any auto-heal commit.

## Examples

- A page with `sources: ["ADR-0001"]` (plain string) → auto-heal converts to `sources: ["[[ADR-0001: Four-Layer Orchestrator]]"]`.
- A new wiki page missing `parent:` and `path:` → auto-heal derives them from the folder location.

## Related Concepts

- [[Curator Agent]] — the agent that runs auto-heal
- [[Lint Rules]] — the checks that produce the findings auto-heal repairs
- [[Git Checkpoint]] — every auto-heal change lands in a reversible commit
