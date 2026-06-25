---
title: "src/commands/snapshot.ts — Git Checkpoint"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "commands", "snapshot", "git"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/commands/snapshot.ts — Git Checkpoint

## Metadata

- **Source**: `raw/repo/src/commands/snapshot.ts`
- **Type**: TypeScript implementation

## Summary

Git-bounds an LLM write phase. `pre` subcommand takes a checkpoint commit (the pre-ingest state); `post` subcommand commits everything written since the checkpoint as one revertible `snapshot:` commit. Always exits 0 — the snapshot is a safety net, not a blocking gate.

## Key Claims

- Two subcommands: `pre` (checkpoint pre-write state) and `post` (commit write-phase output)
- Always exits 0 — a snapshot error is never a pipeline-stopper
- The `pre` snapshot enables reverting an entire ingest with `git revert`
- Used by the ingest agent at preflight (snapshot pre) and after writing pages (snapshot post)
- Operation ID (`--op`) and label (`--label`) tag the commit message for traceability
- `SnapshotReport` carries the git SHA and message for the agent to surface to the user
Covers: Snapshot Command, Git Checkpoint, Pre/Post Write Phase, Revertible Ingest
