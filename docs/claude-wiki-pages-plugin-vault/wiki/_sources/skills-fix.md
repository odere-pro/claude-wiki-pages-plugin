---
title: "Fix Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "fix"]
aliases: ["Fix Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Fix Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/fix/SKILL.md`
- Type: Skill definition for the `fix` verb

## Summary

The `fix` skill applies repairs that `/claude-wiki-pages:lint` identified. It is idempotent — running it twice produces no diff. It expects a fresh lint report in context, or runs its own lint pass internally.

## Key Claims

Covers: Fix Skill, Authorized Repairs, Idempotency, Strict-Tree Drift Repair, READY Signal.

Authorized repairs: missing frontmatter (backfill with schema default), dangling wikilinks (rewrite to nearest alias or comment out), plain-string `sources:` (wrap in wikilink), missing `parent`/`path` (derive from location), MOC missing member (add to `children:`/`child_indexes:`), missing folder note (create at `<folder>/<folder>.md`, never a new `_index.md`), banned legacy values (rewrite `type: moc` → `type: index`). Strict-tree drift is repaired by `strict-tree-reduce.sh --apply`, never by hand-rewriting links. The skill never repairs contradictions, never invents sources, never deletes orphan pages.
