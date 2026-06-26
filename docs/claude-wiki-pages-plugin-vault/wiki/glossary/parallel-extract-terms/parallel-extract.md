---
title: "parallel extract"
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

# parallel extract

## Definition

The map-only phase where multiple extract workers READ sources and RETURN extracted content concurrently, after which a single sequential writer applies them. Names the safe parallelism boundary: only the read+extract half is parallel; dedup and write stay serial. Lives inside the ingest agent, below the orchestrator's one fan-out. See ADR-0026.

## Key Principles

- The map-only phase where multiple extract workers READ sources and RETURN extracted content concurrently, after which a single sequential writer applies them.
- Canonical term in the claude-wiki-pages **Parallel-extract and scheduled-upkeep terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- Defined in `docs/GLOSSARY.md`; see the Canonical Glossary overview for usage in context.

## Related Concepts

Part of the **Parallel-extract and scheduled-upkeep terms** group: extract worker, maxParallelExtract, EXTRACT envelope, degrade-to-sequential, config-home distinction.
