---
title: "Ingest Pipeline"
type: concept
aliases: ["Ingest Pipeline", "ingest pipeline", "pipeline"]
parent: "[[Workflows]]"
path: "workflows"
sources:
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[Entity Distribution Model]]"
  - "[[Hook-Enforced Guarantees]]"
  - "[[Validation and Repair]]"
  - "[[Provenance-Tracked Wiki]]"
depends_on:
  - "[[Claude Code]]"
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Ingest Pipeline

The end-to-end process that turns raw sources in `vault/raw/` into structured, cross-linked, cited wiki pages in `vault/wiki/`.

## Definition

The ingest pipeline is triggered by `/claude-wiki-pages:claude-wiki-pages-ingest-agent` and runs automatically after every agent stop via `subagent-ingest-gate.sh`. It auto-detects unprocessed files by diffing `vault/raw/` against `wiki/log.md` ingest entries, so no argument is needed — drop a file and run the command.

The pipeline follows the [[Entity Distribution Model]]: rather than producing one summary page per source, it distributes extracted knowledge across the existing topic tree, updating pages that already exist for each entity or concept and creating new pages only when none exists.

After the pipeline completes, `subagent-ingest-gate.sh` runs `verify-ingest.sh` and aborts the agent completion if the wiki is left in a structurally broken state.

## Key Principles

Schema-first — the pipeline reads `vault/CLAUDE.md` before touching anything else. Required frontmatter fields, wikilink format, and topic-tree placement all come from the schema.

Update before create — for each extracted entity or concept, the pipeline searches for an existing page by `title` and `aliases` before creating a new one. See [[Entity Distribution Model]].

Structural integrity gate — the `SubagentStop` hook runs `verify-ingest.sh` after every pipeline run. Structural errors surface immediately; the pipeline does not complete silently in a broken state.

Image and text dispatch — the pipeline handles text sources directly. For image sources, Claude's vision extracts on-image text, entities, and concepts natively. The source summary gets `source_format: image` and `attachment_path: raw/assets/<file>`. PDFs must be exported to markdown before ingestion.

## Examples

A single markdown article is dropped into `vault/raw/`. Running the ingest agent produces one source summary in `wiki/_sources/`, updates three existing entity pages with new `sources:` entries, and creates one new concept page for a term not previously in the wiki. The log entry records all pages touched.

A batch of five articles and two screenshots is dropped at once. The pipeline processes all seven, distributing extracted knowledge across the topic tree. The post-completion gate runs `verify-ingest.sh` and reports clean before the agent stops.

## Related Concepts

- [[Entity Distribution Model]] — the update-before-create rule the pipeline enforces.
- [[Hook-Enforced Guarantees]] — the hook bus events (PreToolUse, SubagentStop) that gate every pipeline run.
- [[Validation and Repair]] — the follow-on workflow for auditing and repairing anything the pipeline did not catch.
- [[Provenance-Tracked Wiki]] — the property the pipeline creates by linking every page to its sources.
