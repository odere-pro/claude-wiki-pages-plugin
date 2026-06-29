---
title: "degrade-to-sequential"
type: concept
aliases: []
parent: "[[parallel-extract-terms|Parallel-extract and scheduled-upkeep terms]]"
path: "glossary/parallel-extract-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "parallel-extract-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# degrade-to-sequential

## Definition

The rule that the effective extract concurrency is 1 in any non-Claude, offline, blocked, or unset tier — reusing the existing `route` degrade single-home. `effective` is never greater than 1 in a degraded tier. See ADR-0026.

## Key Principles

- The rule that the effective extract concurrency is 1 in any non-Claude, offline, blocked, or unset tier — reusing the existing `route` degrade single-home.
- Canonical term in the claude-wiki-pages **Parallel-extract and scheduled-upkeep terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `route`
- `effective`

## Related Concepts

Part of the **Parallel-extract and scheduled-upkeep terms** group: parallel extract, extract worker, maxParallelExtract, EXTRACT envelope, config-home distinction.
