---
title: "scripts/snapshot.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/snapshot.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/snapshot.sh

## Summary

Single agent-facing entry point for git-bounding an LLM write phase. Accepts `pre` and `post` subcommands. Delegates to the Bun engine when present; falls back to inline git for degraded installs. Honors `gitCheckpoint.mode` (off skips all operations). Pathspec-scoped to the vault so unrelated project files are never staged. Always exits 0.

## Key Claims

The pre snapshot takes an advisory vault lock (via vault-lock.sh) to serialize concurrent ingest sessions. The post snapshot commits all writes as a revertible `snapshot:` commit labeled with the operation context. Without Bun, the bash fallback uses `git add` with pathspec and `git commit` with a no-verify flag for internal bookkeeping commits. gitCheckpoint.mode = "off" disables all snapshotting for vaults in repos with stricter commit policies.

Covers: Git Checkpoint, Vault Lock, Revertible Write Phase, Snapshot Pre/Post
