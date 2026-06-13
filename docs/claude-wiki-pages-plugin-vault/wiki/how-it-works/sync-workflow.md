---
title: "Sync Workflow"
type: concept
aliases: ["Sync Workflow", "sync workflow", "sync procedure", "sync steps"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Sync Skill (SKILL.md)]]"]
related: ["[[Sync Skill]]", "[[Wired Source]]", "[[sync-source.sh]]", "[[Git Checkpoint]]", "[[Ingest Pipeline]]"]
contradicts: []
supersedes: []
depends_on: ["[[Wired Source]]", "[[Git Checkpoint]]"]
tags: ["concept", "sync", "workflow"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Sync Workflow

## Definition

The sync workflow is the eight-step procedure the Sync skill executes to bring the vault's `raw/` layer up to date with a wired source repository. It is a deterministic, git-checkpointed sequence that runs no judgment logic — all judgment belongs to the subsequent [[Ingest Pipeline]]. The workflow is idempotent and always exits cleanly even when there is nothing to do.

## Key Principles

- The workflow is **read-then-write-then-delegate**: it reads the upstream state, writes only to `raw/` and `_sources/` metadata, then delegates wiki-page updates to the ingest pipeline.
- Every destructive write is preceded by a git snapshot (Step 1) and followed by one (Step 7), making the entire workflow reversible.
- The user confirmation gate (Step 3) is the only human-in-the-loop point. If declined, the workflow exits cleanly with no writes.

## Examples

The full eight-step sequence:

### Step 1 — Snapshot pre

Run `snapshot.sh pre --target <vault>` to git-checkpoint the vault before any write. This is the rollback point if the sync needs to be undone. Always exits 0.

### Step 2 — Status check

Run `sync-source.sh status`. This diffs the wired source's current HEAD against the last recorded sync SHA and reports `WIRED-CHANGES: <name> <N>` for each registered wired source. If all counts are 0, the workflow stops here and reports "wiki is in sync."

### Step 3 — User confirmation

Show the list of changed files and ask for approval before pulling. The pull is additive-only (new files in `raw/`), but the user decides when wiki content refreshes. If declined, exit cleanly.

### Step 4 — Pull

Run `sync-source.sh pull [--name <n>]`. This copies changed docs into `raw/wired/<name>/` as new versioned snapshots (filename: `<stem>--<date>-<sha8>`), applies checksum deduplication to skip unchanged files, and records the wired repo's current HEAD as the new sync point in `settings.json`.

### Step 5 — Mark superseded source notes

For each new versioned snapshot the pull created: if an earlier snapshot of the same doc was already ingested (a `_sources/` summary page exists), edit that summary's frontmatter to set `superseded_by: "[[<new snapshot title>]]"` and append one body line noting the supersession. The `sources:` field on wiki pages is NOT changed — provenance history stays intact; the ingest pipeline's additive merge appends the new source when pages refresh.

### Step 6 — Log

Append to `wiki/log.md`:
```
## [YYYY-MM-DD] sync | <name>
Pulled N snapshot(s) from <name> (<shortsha>). Superseded: M source note(s).
```

### Step 7 — Snapshot post

Run `snapshot.sh post --target <vault> --label "sync <name>"` to commit all sync writes (new `raw/` files, updated `_sources/` metadata, log entry) as a single revertible commit.

### Step 8 — Hand off to ingest

Recommend `/claude-wiki-pages:wiki`. The orchestrator detects the pending snapshots in `raw/` and chains the ingest pipeline. The sync skill itself never ingests — page updates are solely the ingest pipeline's responsibility.

## Related Concepts

- [[Sync Skill]] — the skill definition that specifies this workflow
- [[Wired Source]] — what the workflow reads from
- [[sync-source.sh]] — the Bash script that executes Steps 2 and 4
- [[Git Checkpoint]] — snapshot pre/post safety mechanism (Steps 1 and 7)
- [[Ingest Pipeline]] — the downstream pipeline that the workflow hands off to (Step 8)
