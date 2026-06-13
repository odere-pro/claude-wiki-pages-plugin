---
title: "Sync Skill (SKILL.md)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["sync", "skill", "wired-source"]
aliases: ["Sync Skill (SKILL.md)"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Sync Skill (SKILL.md)

## Metadata

- **Author:** claude-wiki-pages plugin team
- **Publisher:** claude-wiki-pages plugin
- **Published:** 2026-06-13
- **URL:** raw/repo/how-it-works/SKILL.md

## Summary

The Sync skill (`skills/sync/SKILL.md`) defines the eight-step workflow for pulling docs changes from a wired source repository into `vault/raw/` as immutable snapshots. It specifies how superseded source notes are marked, how the operations log is updated, and how re-ingest is handed off to the normal ingest pipeline. The skill is triggered by user phrases such as "sync the wiki" or "pull project changes", or by the `/claude-wiki-pages:sync` slash command.

## Key Claims

1. Sync uses `git diff --name-only <lastSyncedCommit>..HEAD` to detect upstream changes in the wired source repo.
2. Changed docs are copied into `raw/wired/<name>/` as NEW versioned snapshots (raw is immutable — an updated doc never overwrites its earlier snapshot).
3. Sync itself never writes wiki pages — re-ingest of the new snapshots updates pages.
4. Superseded source notes receive `superseded_by:` frontmatter and a body notice line.
5. The workflow is bookended by `snapshot.sh pre` and `snapshot.sh post` git checkpoints.
6. `sync-source.sh status` reports `WIRED-CHANGES: <name> <N>` lines; if all counts are 0, the skill stops early.
7. The skill is idempotent: re-running after a completed sync reports count 0 and stops.
8. On completion the skill recommends `/claude-wiki-pages:wiki` to re-ingest the new snapshots.

## Entities Mentioned

- sync-source.sh (tool script)

## Concepts Mentioned

- Wired Source (registered git work tree with docs-only include globs)
- Sync Workflow (8-step: pre-snapshot, status, confirm, pull, mark superseded, log, post-snapshot, hand off)
- Sync Skill (the skill that orchestrates the above)
- Immutable raw/ directory (raw is write-once; sync adds new files, never overwrites)
