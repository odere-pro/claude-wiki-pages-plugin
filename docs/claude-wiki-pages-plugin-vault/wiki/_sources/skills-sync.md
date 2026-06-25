---
title: "Sync Skill — SKILL.md"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["skills", "sync"]
aliases: ["Sync Skill — SKILL.md"]
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Sync Skill — SKILL.md

## Metadata

- Source: `raw/repo/skills/sync/SKILL.md`
- Type: Skill definition for the `sync` verb

## Summary

The `sync` skill pulls docs changes from a wired source (a registered project repository) into `vault/raw/` as immutable snapshots, marks superseded source notes, and queues new snapshots for re-ingest. It never writes wiki pages directly — pages update when ingest processes the new snapshots.

## Key Claims

Covers: Sync Skill, Wired Source, Version-Stamped Snapshots, Superseded Source Notes, Idempotency.

A wired source is a git work tree registered in settings.json with docs-only include globs. Sync detects upstream changes with `git diff --name-only <lastSyncedCommit>..HEAD`, copies changed docs into `raw/wired/<name>/` as new versioned snapshots (checksum-deduped, never overwriting earlier snapshots). For each versioned snapshot, if an earlier snapshot of the same doc was already ingested, the skill edits its `wiki/_sources/` summary to add `superseded_by:` and one body note. Completion: `SYNCED:` on success, `IN-SYNC:` when no changes, `FAILED:` only when `sync-source.sh` itself exits non-zero.
