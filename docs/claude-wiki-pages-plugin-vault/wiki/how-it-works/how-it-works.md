---
title: "How It Works"
type: index
aliases: ["How It Works", "how-it-works", "how it works", "HIW", "sync and wire mechanics"]
parent: "[[Wiki Index]]"
path: "how-it-works"
children:
  - "[[Sync Skill]]"
  - "[[Sync Workflow]]"
  - "[[Wired Source]]"
  - "[[sync-source.sh]]"
  - "[[Vault Lifecycle]]"
  - "[[Architecture Decision Record]]"
  - "[[Baseline Arm]]"
  - "[[Scaffolding Ablation]]"
  - "[[Challenge Mode]]"
  - "[[Onboarding Wizard]]"
  - "[[Time-to-First-Value]]"
  - "[[Backlog]]"
  - "[[Doctor Command]]"
  - "[[Heartbeat]]"
  - "[[Installation]]"
  - "[[Maintenance Loop]]"
  - "[[Host-Project Intake]]"
  - "[[Scheduled Upkeep]]"
  - "[[Fill-Gaps Skill]]"
  - "[[Graph Quality]]"
  - "[[Dangling Wikilink]]"
  - "[[Node Concentration]]"
child_indexes: []
tags: ["how-it-works", "sync", "wired-source", "skills", "workflows", "fill-gaps", "graph-quality"]
created: 2026-06-13
updated: 2026-06-15
---

# How It Works

> [!summary]
> The How It Works cluster covers the sync subsystem: registering a git work tree as a [[Wired Source]], pulling changed documentation into `raw/wired/<name>/` via [[sync-source.sh]], tracking the eight-step [[Sync Workflow]], and the [[Sync Skill]] that orchestrates the full process. Sync never writes wiki pages — it only moves files into `raw/` as immutable versioned snapshots, then hands off to the [[Ingest Pipeline]]. Every sync is git-checkpointed and reversible with `git revert`.

## Overview

The sync subsystem answers the question: how does the wiki stay current with a project that keeps evolving? The answer is a wired-source relationship — a registered git work tree (typically the host project) that contributes documentation-only content to the vault.

The three-phase lifecycle is:

1. **Wire** — register the project repo as a wired source in `settings.json` with docs-only include globs. This is a one-time setup step.
2. **Sync** — when docs change upstream, run `/claude-wiki-pages:sync` (or wait for the `SYNC:` heartbeat). The skill detects changed files, asks for confirmation, copies new versioned snapshots into `raw/wired/<name>/`, and marks previously ingested source notes as superseded.
3. **Ingest** — run `/claude-wiki-pages:wiki` to process the new snapshots. The normal [[Ingest Pipeline]] picks them up and updates wiki pages.

Two invariants govern the sync subsystem. **Raw is immutable:** an updated doc never overwrites its earlier snapshot; a new versioned sibling file is created instead. **Sync never writes wiki pages:** it only populates `raw/`. Wiki pages change only when the [[Ingest Pipeline]] processes the new snapshots afterward.

## Key Pages

[[Sync Skill]] is the eight-step operational procedure for bringing the wiki up to date with a wired source. Trigger phrases include "sync the wiki", "pull project changes", the `SYNC:` heartbeat notice, or the `/claude-wiki-pages:sync` command. The skill is idempotent: re-running after a completed sync reports zero changes and stops. The workflow is bookended by `snapshot.sh pre` and `snapshot.sh post`, making every sync reversible.

[[Wired Source]] defines what a wired source is: a git work tree registered in `settings.json` with docs-only include globs (README, `docs/`, ADRs, RFCs — never source code). The vault's `raw/wired/<name>/` directory receives new immutable snapshots whenever the wired source's docs change. Checksum deduplication prevents redundant re-ingest when file content has not changed.

[[Sync Workflow]] provides the step-by-step breakdown of all eight sync steps: (1) detect wired sources; (2) `sync-source.sh status` to find changed files; (3) show the diff to the user; (4) await confirmation; (5) `sync-source.sh pull` to copy new versioned snapshots; (6) mark old source notes as superseded; (7) update `log.md`; (8) recommend re-running `/claude-wiki-pages:wiki`.

[[sync-source.sh]] is the deterministic bash script that implements wired-source detection and file copying. It reads the last-synced SHA from `settings.json`, diffs `HEAD` against that SHA to find changed docs, and copies each changed file as a new versioned snapshot (`<stem>--<date>-<sha8>`). It never overwrites existing snapshots.

[[Operations Log]] is the chronological record of every wiki operation — ingest, lint, snapshot, query, and sync. The log is appended at the end of each skill run and is the authoritative provenance trail for the vault's history.

## Open Questions

- The `SYNC:` heartbeat notice is referenced in the Sync Skill but the trigger mechanism is not yet documented in this cluster. Should a page on the heartbeat/maintenance integration be added here?
- When a wired source repo is removed or archived, what is the correct procedure for detaching it? A page documenting deregistration would complete the lifecycle.
