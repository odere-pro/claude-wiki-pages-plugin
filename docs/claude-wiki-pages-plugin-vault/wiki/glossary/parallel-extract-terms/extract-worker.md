---
title: "extract worker"
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

# extract worker

## Definition

The read-only subagent (`claude-wiki-pages-extract-worker-agent`) the ingest agent fans out to during a parallel extract. Its `tools:` are exactly `Read, Glob, Grep` — no Write/Edit/Bash — enforced by a Tier-1 grep gate, so a worker cannot write the vault. Returns an EXTRACT envelope only. See ADR-0026.

## Key Principles

- The read-only subagent (`claude-wiki-pages-extract-worker-agent`) the ingest agent fans out to during a parallel extract.
- Canonical term in the claude-wiki-pages **Parallel-extract and scheduled-upkeep terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `claude-wiki-pages-extract-worker-agent`
- `tools:`
- `Read, Glob, Grep`

## Related Concepts

Part of the **Parallel-extract and scheduled-upkeep terms** group: parallel extract, maxParallelExtract, EXTRACT envelope, degrade-to-sequential, config-home distinction.
