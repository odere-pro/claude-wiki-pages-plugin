---
title: "Review, Validate, Fix"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Review, Validate, Fix"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

Describes three levels of validation: Level 1 status check (one-command smoke test covering every hook path), Level 2 lint skill (read-only audit for broken wikilinks, orphan pages, stale pages, missing frontmatter, ghost nodes, excessive nesting, near-duplicates, plain-string sources), and Level 3 curator agent (auto-repair in phases). Level 4 covers what the agent punts to manual review.

## Key Claims

- `/claude-wiki-pages:status` exercises every hook path and `verify-ingest.sh`.
- The lint skill reports errors (broken links, missing frontmatter, ghost nodes, plain-string sources) and warnings (orphans, stale pages, near-duplicates, single-source high confidence).
- The curator agent fixes in phases: sources → vault MOC → per-folder MOCs → parent/path → broken links → orphans → aliases → graph colors → flat-folder splits → body densification.
- The agent will NOT delete content, merge near-duplicates, create links to non-existent pages, or lower a confidence value.
- `subagent-lint-gate.sh` aborts completion if unresolved errors remain after the curator agent.
- Pages with `confidence >= 0.8` and a single source are flagged as suspiciously confident.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]
- [[Obsidian]]

## Concepts Covered

- [[Validation and Repair]]
- [[Hook-Enforced Guarantees]]
- [[Provenance-Tracked Wiki]]
- [[LLM Wiki Pattern]]
