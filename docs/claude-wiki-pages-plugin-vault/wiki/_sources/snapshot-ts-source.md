---
title: "snapshot.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "snapshot", "git"]
aliases: ["snapshot.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# snapshot.ts Source

## Summary

`src/commands/snapshot/snapshot.ts` implements the `snapshot pre/post` verb that git-bounds write phases that happen outside the engine (ingest, curator judgment fixes, polish). `pre` checkpoints the pre-write state; `post` commits whatever the phase wrote (pathspec-scoped to the vault). Both honor `gitCheckpoint.mode` — `"off"` is a no-op. A paper trace: `post` appends to `wiki/log.md` BEFORE committing so the pre-state anchor lands inside the snapshot commit. Always exits 0.

## Key Claims

- `SnapshotSub` is `"pre" | "post"`.
- `mode: "off"` skips and returns `skipped: true, reason: "gitCheckpoint.mode=off"`.
- `post` with a clean vault returns `skipped: true, reason: "clean"` — not an error.
- Paper trace: `appendLog()` is called before `commit()` so the log entry is inside the snapshot commit.
- `opId` is derived from ISO timestamp if not injected; injectable for deterministic tests.
- `gitCfg.push === "auto"` triggers `push(vault)` after a successful commit.
- `ensureRepo(vault)` is called in degraded path when the repo vanished between pre and post.
