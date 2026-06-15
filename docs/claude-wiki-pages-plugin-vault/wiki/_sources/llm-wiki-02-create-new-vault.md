---
title: "User Guide 02: Create a New Vault"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["guide", "vault", "scaffold"]
aliases: ["User Guide 02: Create a New Vault"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# User Guide 02: Create a New Vault

## Summary

How to create a fresh vault: Option A (first-time or re-initialize), Option B (second vault in a different project). Documents what gets created and the first-source end-to-end flow.

## Key Claims

- Option A: `/claude-wiki-pages:init` from the project directory — writes `vault/CLAUDE.md`, `_templates/`, `wiki/index.md`, `wiki/log.md`.
- Option B: same install, different project directory — two independent vaults.
- `vault/CLAUDE.md` is the schema authority; customize it, not the skills.
- Ingest pipeline steps: read schema → dispatch by file extension → write source summary → extract to topic folder → update index/log.
- PDFs are deferred: export to markdown first.
