---
title: "Snapshot Command"
type: concept
aliases: ["snapshot-command", "snapshot verb", "Git Checkpoint Snapshot"]
parent: "[[src-commands|Src Commands]]"
path: "src/commands"
sources: ["[[src-commands-snapshot|src/commands/snapshot.ts — Git Checkpoint]]"]
related: []
tags: ["src", "commands", "snapshot", "git", "checkpoint"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Snapshot Command

Git-bounds an LLM write phase. `pre` takes a checkpoint commit capturing the pre-write state; `post` commits everything written since as one revertible `snapshot:` commit. Always exits 0 — the snapshot is a safety net, never a pipeline-stocker.

## Definition

`commands/snapshot/snapshot.ts` implements the pre/post checkpoint pattern that makes every ingest and synthesis run revertible with `git revert`.

## Key Principles

**Two subcommands**:
- `snapshot pre`: captures the current state as a `checkpoint:` commit (pre-ingest state)
- `snapshot post`: commits everything written since the `pre` checkpoint as a `snapshot:` commit

**Always exits 0**: a snapshot error is never a pipeline-stopper. The agent always proceeds; a clean vault reports "nothing to commit" gracefully.

**`--op <id>`**: operation ID tags the commit message for traceability.

**`--label <msg>`**: human-readable label embedded in the snapshot commit message (e.g. `"ingest docs/architecture"`)

**`SnapshotReport`**: carries the git SHA and message for the agent to surface to the user.

**Ingest agent use**:
1. Preflight: `snapshot pre --target <vault>` (before any writes)
2. After all ingest writes: `snapshot post --target <vault> --label "ingest <source titles>"`
3. Each synthesis run gets its own `snapshot post`

**Advisory lock**: `snapshot pre` takes a vault advisory lock (via `vault-lock.sh` / `vault-lock.ts`). A second session that cannot acquire within 30 s should abort.

## Examples

- `claude-wiki-pages snapshot pre --target /my/vault` → creates checkpoint commit, prints SHA
- `claude-wiki-pages snapshot post --target /my/vault --label "ingest architecture"` → creates snapshot commit

## Related Concepts

- `core/git.ts` provides the underlying git operations (`ensureRepo`, `applyCheckpointMode`, etc.)
- `core/vault-lock.ts` provides the in-process advisory lock
- The `snapshot` pattern separates ingest writes and heal fixes into individually revertible commits
