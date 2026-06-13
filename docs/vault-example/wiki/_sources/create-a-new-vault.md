---
title: "Create a New Vault"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: []
aliases: ["Create a New Vault"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

## Summary

Explains how to scaffold a fresh vault — either as a first-time initialization or as a second vault in a different project. Covers Option A (re-initialize with `/claude-wiki-pages:init`) and Option B (install the plugin globally then scaffold the second project). Also documents the full first-source end-to-end flow: drop a file into `vault/raw/`, run the ingest pipeline, verify with `/claude-wiki-pages:status`.

## Key Claims

- `/claude-wiki-pages:init` asks for vault name, domain, and paths, then writes `vault/CLAUDE.md`, `_templates/`, and the bookkeeping files.
- Topic folders are created on demand by the ingest workflow; they do not exist until a source introduces that topic.
- The ingest pipeline dispatches by file extension (text vs image); PDFs must be exported to markdown first.
- The `SubagentStop` gate runs `verify-ingest.sh` and a lint pass after every ingest agent run.
- For images, the source summary carries `source_format: image` and `attachment_path: raw/assets/<file>`.

## Entities Mentioned

- [[Claude Code]]
- [[Obsidian]]
- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Vault Scaffolding]]
- [[Ingest Pipeline]]
- [[Hook-Enforced Guarantees]]
- [[Entity Distribution Model]]
