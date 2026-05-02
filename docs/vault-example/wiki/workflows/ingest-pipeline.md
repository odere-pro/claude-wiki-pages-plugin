---
title: "Ingest Pipeline"
type: concept
aliases: ["Ingest Pipeline", "ingest-pipeline", "llm-wiki-stack-ingest-agent"]
parent: "[[Workflows — Index]]"
path: "workflows"
sources:
  - "[[Using llm-wiki-stack]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
related: ["[[Entity Distribution Model]]", "[[Hook-Enforced Guarantees]]", "[[Lint-Fix Workflow]]", "[[llm-wiki-stack]]"]
contradicts: []
supersedes: []
depends_on: ["[[Vault Scaffolding]]"]
tags: ["workflow"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.9
---

# Ingest Pipeline

## Definition

The default, single-command workflow for pulling new sources into the wiki. Invoked as `/llm-wiki-stack:llm-wiki-stack-ingest-agent`. Composes three steps: ingest → lint-fix → optional synthesis.

## Key Principles

- Auto-diffs `raw/` against `wiki/log.md` to find unprocessed sources; no argument required.
- Dispatches by file extension (text vs image); PDFs are deferred — export to markdown first.
- Writes a source summary in `wiki/_sources/`, extracts entities and concepts into the correct topic folders (creating them on demand), updates `wiki/index.md`, and appends to `wiki/log.md`.
- On completion, `subagent-ingest-gate.sh` reruns `verify-ingest.sh`; if the wiki is left in a half-written state, the agent's completion is aborted.

## Examples

- Text source: `cp article.md vault/raw/ && /llm-wiki-stack:llm-wiki-stack-ingest-agent`. Pipeline writes summary, extracts mentions, updates indexes.
- Image source: `cp screenshot.png vault/raw/assets/ && /llm-wiki-stack:llm-wiki-stack-ingest-agent`. Source summary gets `source_format: image` and an `attachment_path:`; `validate-attachments.sh` blocks the write if the file is missing.
- Batch: drop several text and image files together; the pipeline handles them in one pass.

## Related Concepts

- [[Entity Distribution Model]] — the DRY rule the pipeline enforces.
- [[Lint-Fix Workflow]] — what the pipeline runs after ingest.
- [[Vault Scaffolding]] — prerequisite.
