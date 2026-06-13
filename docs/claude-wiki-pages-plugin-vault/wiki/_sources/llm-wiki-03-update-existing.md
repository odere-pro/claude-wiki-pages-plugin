---
title: "User Guide 03: Update Existing Vault"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["guide", "ingest", "update"]
aliases: ["User Guide 03: Update Existing Vault"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# User Guide 03: Update Existing Vault

## Summary

How to add single sources, image sources, batches. Power-user bypasses. DRY rules for new pages. When to run lint.

## Key Claims

- Adding a source: `cp file vault/raw/` → `/claude-wiki-pages:wiki` — orchestrator detects new files and dispatches ingest.
- Batch ingest: text + images together; `subagent-ingest-gate.sh` automatically verifies on agent stop.
- Power-user bypass: call `claude-wiki-pages-ingest-agent` directly to skip orchestrator state probe.
- DRY rule: before creating a new page, search for an existing page with matching title or alias — append rather than duplicate.
- Lint schedule: every 10 ingests, or when graph orphans appear, or when status reports index drift.

## Entities Mentioned

- [[Ingest Agent]]

## Concepts Covered

- [[Ingest Pipeline]]
- [[Entity Distribution Model]]
- [[DRY Single-Sourcing]]
