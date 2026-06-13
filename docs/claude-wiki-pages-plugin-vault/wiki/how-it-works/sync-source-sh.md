---
title: "sync-source.sh"
type: entity
entity_type: tool
aliases: ["sync-source.sh", "sync-source", "sync source script"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Sync Skill (SKILL.md)]]", "[[Engine Scripts Layer (CLAUDE.md)]]"]
related: ["[[Sync Skill]]", "[[Wired Source]]", "[[Sync Workflow]]", "[[Git Checkpoint]]", "[[Ingest Pipeline]]", "[[Scripts Layer]]"]
tags: ["entity", "tool", "script", "sync"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# sync-source.sh

## Overview

`sync-source.sh` is the deterministic Bash script in the `scripts/` layer that implements the wired-source detection and file-copying operations for the [[Sync Skill]]. It is the Layer 4 (Orchestration) implementation behind Steps 2 and 4 of the [[Sync Workflow]]. The script operates on the registered wired sources in `settings.json` and writes only to `raw/wired/<name>/` — it never touches `wiki/`.

The script is intentionally thin: no logic for deciding what to ingest, no wiki page writes, no git commits. It is a pure data-movement script. All judgment (what has changed, what to tell the user, what to mark superseded) lives in the [[Sync Skill]] layer above it.

## Key Facts

- **`sync-source.sh status`** — reads `settings.json` for registered wired sources, diffs each wired repo's current HEAD against the last recorded sync SHA using `git diff --name-only <lastSHA>..HEAD`, and prints `WIRED-CHANGES: <name> <N>` for each source. Output is machine-parseable by the Sync skill. Exit 0 always.
- **`sync-source.sh pull [--name <n>]`** — copies changed docs from the named wired source (or all registered sources if `--name` is omitted) into `raw/wired/<name>/` as new versioned snapshot files, then updates the sync point in `settings.json` to the wired repo's current HEAD commit.
- **Snapshot filename pattern**: `<stem>--<YYYY-MM-DD>-<sha8>.md` where `sha8` is the first 8 characters of the wired repo's HEAD commit. Example: `architecture--2026-06-13-ba60920.md`.
- **Checksum deduplication**: before writing a new snapshot, the script computes the SHA of the source file content. If an existing snapshot in `raw/wired/<name>/` has the same content SHA, the copy is skipped. This prevents redundant ingests when a file appears changed by git diff but content is identical (e.g., line-ending normalization).
- **Raw immutability**: the script never overwrites an existing snapshot. It always creates a new sibling file. The `protect-raw.sh` hook enforces this at the write level; the script honors the same invariant in its own logic.
- **Idempotent**: running `pull` twice in a row produces `WIRED-CHANGES: <name> 0` on the second `status` check because the sync point has already been advanced to HEAD.

## Relationship to the Broader Pipeline

`sync-source.sh` only moves files. The full sync lifecycle, from detection to wiki update, is:

```
sync-source.sh status   →  Detect changed docs
sync-source.sh pull     →  Copy new versioned snapshots into raw/wired/<name>/
(Sync Skill)            →  Mark old _sources/ notes as superseded
/claude-wiki-pages:wiki →  Ingest Pipeline picks up new snapshots
```

The script never calls `snapshot.sh` itself — the [[Sync Skill]] wraps the pull in `snapshot.sh pre` / `snapshot.sh post` calls that git-checkpoint the vault.

## Related

- [[Sync Skill]] — the skill that calls this script and wraps it in checkpoints
- [[Sync Workflow]] — the eight-step workflow in which this script executes Steps 2 and 4
- [[Wired Source]] — the registered git work tree this script reads from
- [[Git Checkpoint]] — the snapshot.sh calls that bracket sync-source.sh invocations
- [[Ingest Pipeline]] — the downstream pipeline that processes the files this script writes
- [[Scripts Layer]] — the broader shell layer this script belongs to
