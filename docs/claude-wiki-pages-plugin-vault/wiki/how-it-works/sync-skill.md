---
title: "Sync Skill"
type: concept
aliases: ["Sync Skill", "sync skill", "sync", "/claude-wiki-pages:sync"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/sync-skill|Sync Skill (SKILL.md)]]"]
related: ["[[wired-source|Wired Source]]", "[[sync-workflow|Sync Workflow]]", "[[sync-source-sh|sync-source.sh]]", "[[ingest-pipeline|Ingest Pipeline]]", "[[git-checkpoint|Git Checkpoint]]", "[[ingest-agent|Ingest Agent]]"]
contradicts: []
supersedes: []
depends_on: ["[[wired-source|Wired Source]]", "[[git-checkpoint|Git Checkpoint]]"]
tags: ["concept", "sync", "skill"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Sync Skill

## Definition

The Sync skill (`skills/sync/SKILL.md`) is the operational procedure for bringing the wiki up to date with a wired source repository. It detects upstream documentation changes in the registered wired source, copies new docs into `vault/raw/` as immutable versioned snapshots, marks previously ingested source notes as superseded, and hands off to the normal [[ingest-pipeline|Ingest Pipeline]] for re-ingesting the changed content. The skill is triggered by user phrases such as "sync the wiki" or "pull project changes", the `SYNC:` heartbeat notice, or the `/claude-wiki-pages:sync` slash command.

## Key Principles

- **Sync never writes wiki pages.** It copies files into `raw/` and marks old source summaries as superseded. Wiki pages are updated only when ingest processes the new snapshots afterward.
- **Raw is immutable.** An updated doc never overwrites its earlier snapshot; a new versioned sibling file is created instead (filename pattern: `<stem>--<date>-<sha8>`).
- **Idempotent.** Re-running after a completed sync reports `WIRED-CHANGES: <name> 0` and stops without side effects.
- **Git-checkpointed.** The workflow is bookended by `snapshot.sh pre` (before any write) and `snapshot.sh post` (after all writes), making every sync reversible with `git revert`.
- **Confirm before pull.** The user sees the changed-file list and approves before any files are copied — the pull is additive-only but the user decides when wiki content refreshes.

## Examples

A typical sync sequence when the wired source repo has two changed docs:

1. `sync-source.sh status` prints `WIRED-CHANGES: my-project 2`.
2. The skill shows the two changed files and asks for confirmation.
3. `sync-source.sh pull` copies both as new versioned snapshots in `raw/wired/my-project/`.
4. The two previously ingested source notes get `superseded_by:` set.
5. `log.md` gets a `## [2026-06-13] sync | my-project` entry.
6. The skill recommends `/claude-wiki-pages:wiki` to re-ingest the new snapshots.

## Related Concepts

- [[wired-source|Wired Source]] — the registered git work tree that the sync skill targets
- [[sync-workflow|Sync Workflow]] — step-by-step breakdown of all eight sync steps
- [[sync-source-sh|sync-source.sh]] — the Bash script that handles detection and file copying
- [[ingest-pipeline|Ingest Pipeline]] — the follow-on pipeline that updates wiki pages after sync
- [[git-checkpoint|Git Checkpoint]] — the snapshot pre/post mechanism that makes sync reversible
