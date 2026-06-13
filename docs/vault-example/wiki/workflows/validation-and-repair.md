---
title: "Validation and Repair"
type: concept
aliases: ["Validation and Repair", "validation and repair", "lint", "repair"]
parent: "[[Workflows]]"
path: "workflows"
sources:
  - "[[Review, Validate, Fix]]"
  - "[[Check the Dashboard]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[Hook-Enforced Guarantees]]"
  - "[[Ingest Pipeline]]"
  - "[[Dashboard Monitoring]]"
depends_on:
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Validation and Repair

Validation and repair is a three-level system for maintaining wiki integrity. Level 1 is a quick smoke test; Level 2 is a read-only audit; Level 3 is automated repair. Level 4 covers what the agent punts to manual review.

## Level 1 — status (smoke test)

```
/claude-wiki-pages:status
```

Exercises every hook path and runs `verify-ingest.sh`. Reports green/red per path. Green everywhere means all hooks are firing and the vault is structurally clean.

## Level 2 — lint (read-only audit)

```
/claude-wiki-pages:lint
```

Scans for: broken wikilinks (Error), orphan pages (Warning), stale pages (Info), missing frontmatter fields (Error), ghost nodes from title missing in aliases (Error), excessive nesting (Warning), near-duplicate bodies (Warning), single-source high confidence (Warning), plain-string sources (Error).

## Level 3 — curator agent (auto-repair)

```
/claude-wiki-pages:claude-wiki-pages-curator-agent
```

Fixes in phases: sources → vault MOC → per-folder MOCs → parent/path → broken links → orphans → aliases → graph colors → flat-folder splits → body densification. After finishing, `subagent-lint-gate.sh` aborts completion if unresolved errors remain.

## What the agent will NOT do

- Delete content.
- Merge near-duplicate pages.
- Create links to non-existent pages.
- Lower a confidence value.

## Cadence

Run status after every pipeline; run lint every 10 ingests or when warnings appear; run the curator agent when lint finds errors or warnings.
