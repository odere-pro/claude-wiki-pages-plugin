---
title: "sync-source.sh"
type: entity
entity_type: tool
aliases: ["sync-source.sh", "sync-source", "sync source script"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Sync Skill (SKILL.md)]]"]
related: ["[[Sync Skill]]", "[[Wired Source]]", "[[Sync Workflow]]", "[[Git Checkpoint]]"]
tags: ["entity", "tool", "script", "sync"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# sync-source.sh

## Overview

`sync-source.sh` is the deterministic Bash script in the `scripts/` layer that implements the wired-source detection and file-copying operations for the Sync skill. It is the Layer 4 (Orchestration) implementation behind Steps 2 and 4 of the [[Sync Workflow]]. The script operates on the registered wired sources in `settings.json` and writes only to `raw/wired/<name>/` — it never touches `wiki/`.

## Key Facts

- **`sync-source.sh status`** — reads `settings.json` for registered wired sources, diffs each wired repo's current HEAD against the last recorded sync SHA, and prints `WIRED-CHANGES: <name> <N>` for each. Output is machine-parseable by the Sync skill.
- **`sync-source.sh pull [--name <n>]`** — copies changed docs from the named wired source (or all registered sources if `--name` is omitted) into `raw/wired/<name>/` as new versioned snapshot files (pattern: `<stem>--<date>-<sha8>`), applies checksum deduplication to skip content-identical files, and updates the sync point in `settings.json` to the wired repo's current HEAD commit.
- The script never overwrites an existing snapshot — raw is immutable. It always creates new sibling files for changed docs.
- The script is idempotent: running `pull` twice in a row produces count-0 on the second run because the sync point has already been advanced.

## Related

- [[Sync Skill]] — the skill that calls this script
- [[Sync Workflow]] — the eight-step workflow in which this script executes Steps 2 and 4
- [[Wired Source]] — the registered git work tree this script reads from
- [[Git Checkpoint]] — the snapshot.sh calls that bracket sync-source.sh invocations
