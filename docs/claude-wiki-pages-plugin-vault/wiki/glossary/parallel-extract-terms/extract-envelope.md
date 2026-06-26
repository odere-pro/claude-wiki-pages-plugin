---
title: "EXTRACT envelope"
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

# EXTRACT envelope

## Definition

The typed, closed-vocabulary record an extract worker returns: `{sourceSummary, keyClaims[], entities[], concepts[], predicates[]}` keyed to the 9 page classes and the schema's closed enums, with claim-level `source`/`quote`/`derived`/`confidence`. Carries extracted content only — never a create/update verdict. See ADR-0026.

## Key Principles

- The typed, closed-vocabulary record an extract worker returns: `{sourceSummary, keyClaims[], entities[], concepts[], predicates[]}` keyed to the 9 page classes and the schema's closed enums, with claim-level `source`/`quote`/`derived`/`confidence`.
- Canonical term in the claude-wiki-pages **Parallel-extract and scheduled-upkeep terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `{sourceSummary, keyClaims[], entities[], concepts[], predicates[]}`
- `source`
- `quote`
- `derived`
- `confidence`

## Related Concepts

Part of the **Parallel-extract and scheduled-upkeep terms** group: parallel extract, extract worker, maxParallelExtract, degrade-to-sequential, config-home distinction.
