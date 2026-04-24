---
title: "Lint-Fix Workflow"
type: concept
aliases: ["Lint-Fix Workflow", "lint-fix-workflow"]
parent: "[[Workflows — Index]]"
path: "workflows"
sources:
  - "[[Review, Validate, Fix]]"
  - "[[Check the Dashboard]]"
related: ["[[Hook-Enforced Guarantees]]", "[[Ingest Pipeline]]", "[[llm-wiki-stack]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["workflow", "validation"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.8
---

# Lint-Fix Workflow

## Definition

Three-level validation ladder: `llm-wiki-status` (smoke test), `llm-wiki-lint` (read-only audit), `llm-wiki-lint-fix` (auto-repair). Each level is a superset of the previous. Lint reports; fix mutates.

## Key Principles

- Status is fast and exercises every hook path; run after every batch ingest.
- Lint is read-only and reports broken wikilinks, orphans, stale pages, missing frontmatter, ghost nodes, excessive nesting, near-duplicates, single-source high confidence, plain-string `sources:`, and banned frontmatter values.
- Fix applies staged phases (sources → vault MOC → per-folder MOCs → parent/path → broken links → orphans → aliases → graph colors → flat-folder splits → body densification) then re-runs lint and compares before/after counts.
- The repair agent deliberately refuses to delete content, merge near-duplicates, create unresolvable wikilinks, or lower confidence — those stay human decisions.

## Examples

- After a batch ingest with warnings, run `/llm-wiki-stack:llm-wiki-lint-fix`; it repairs structural issues and surfaces the rest.
- `/llm-wiki-stack:llm-wiki-fix` skips the analysis phase and applies known fixes directly — useful when you trust the prior lint report.

## Related Concepts

- [[Hook-Enforced Guarantees]] — the hook-based layer lint complements.
- [[Ingest Pipeline]] — lint-fix is its default tail.
