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

The ingest pipeline is the end-to-end process that turns raw sources in `vault/raw/` into structured, cross-linked wiki pages in `vault/wiki/`. It is triggered by `/claude-wiki-pages:claude-wiki-pages-ingest-agent` and runs automatically after every agent stop via `subagent-ingest-gate.sh`.

## Pipeline steps

1. Read `vault/CLAUDE.md` (the schema) before touching anything.
2. Detect unprocessed files by diffing `vault/raw/` against `wiki/log.md` ingest entries.
3. Dispatch by file type (text vs image; PDFs must be exported to markdown first).
4. Write a source summary in `wiki/_sources/` with full frontmatter.
5. Extract entities and concepts; place each in the correct topic folder (create the folder + folder note if missing).
6. Update existing pages rather than creating duplicates ([[Entity Distribution Model]]).
7. Update `wiki/index.md` and append to `wiki/log.md`.
8. After the agent stops, `subagent-ingest-gate.sh` runs `verify-ingest.sh` and aborts completion if the wiki is left in a half-written state.

## Image handling

Claude's vision reads images natively. The source summary gets `source_format: image` and `attachment_path: raw/assets/<file>`. The `validate-attachments.sh` hook blocks the write if the attachment is missing.
