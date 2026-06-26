---
title: "maxParallelExtract"
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

# maxParallelExtract

## Definition

The opt-in cap (`maintenance.maxParallelExtract`) on concurrent extract workers. Default 1 = byte-identical to today; clamps to `[1,8]`. A leaf of the existing `maintenance` config block, not a new object. See ADR-0026.

## Key Principles

- The opt-in cap (`maintenance.maxParallelExtract`) on concurrent extract workers.
- Canonical term in the claude-wiki-pages **Parallel-extract and scheduled-upkeep terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `maintenance.maxParallelExtract`
- `[1,8]`
- `maintenance`

## Related Concepts

Part of the **Parallel-extract and scheduled-upkeep terms** group: parallel extract, extract worker, EXTRACT envelope, degrade-to-sequential, config-home distinction.
