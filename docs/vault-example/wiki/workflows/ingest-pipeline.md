---
title: "Ingest Pipeline"
type: concept
aliases: ["Ingest Pipeline", "ingest-pipeline", "claude-wiki-pages-ingest-agent"]
parent: "[[Workflows — Index]]"
path: "workflows"
sources:
  - "[[Using claude-wiki-pages]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
related: ["[[Hook-Enforced Guarantees]]", "[[claude-wiki-pages]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["workflow"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.9
---

# Ingest Pipeline

## Definition

The default, single-command workflow for pulling new sources into the wiki. Invoked as `/claude-wiki-pages:claude-wiki-pages-ingest-agent`. Composes three steps: ingest → lint-fix → optional synthesis.

## Key Principles

- Auto-diffs `raw/` against `wiki/log.md` to find unprocessed sources; no argument required.
- Dispatches by file extension (text vs image); PDFs are deferred — export to markdown first.
- Writes a source summary in `wiki/_sources/`, extracts entities and concepts into the correct topic folders (creating them on demand), updates `wiki/index.md`, and appends to `wiki/log.md`.
- On completion, `subagent-ingest-gate.sh` reruns `verify-ingest.sh`; if the wiki is left in a half-written state, the agent's completion is aborted.

## Examples

- Text source: `cp article.md vault/raw/ && /claude-wiki-pages:claude-wiki-pages-ingest-agent`. Pipeline writes summary, extracts mentions, updates indexes.
- Image source: `cp screenshot.png vault/raw/assets/ && /claude-wiki-pages:claude-wiki-pages-ingest-agent`. Source summary gets `source_format: image` and an `attachment_path:`; `validate-attachments.sh` blocks the write if the file is missing.
- Batch: drop several text and image files together; the pipeline handles them in one pass.

## Related Concepts

- [[Hook-Enforced Guarantees]] — the gate that aborts the pipeline if the wiki is left half-written.
- [[claude-wiki-pages]] — the plugin that ships this pipeline.
