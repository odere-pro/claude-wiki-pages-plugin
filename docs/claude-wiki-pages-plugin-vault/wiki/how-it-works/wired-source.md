---
title: "Wired Source"
type: concept
aliases: ["Wired Source", "wired source", "wired repo", "wired source repository"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Sync Skill (SKILL.md)]]"]
related: ["[[Sync Skill]]", "[[Sync Workflow]]", "[[sync-source.sh]]", "[[Ingest Pipeline]]", "[[Firewall]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "sync", "wired-source"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Wired Source

## Definition

A wired source is a git work tree — typically the host project — that has been registered in `settings.json` with docs-only include globs. Registration scopes what the sync skill copies: only documentation files (README, `docs/`, ADRs, RFCs) are eligible; source code is never pulled into `raw/`. The wired source is the supply side of the sync relationship: the plugin vault's `raw/wired/<name>/` directory is the demand side, receiving new immutable snapshots whenever the wired source's docs change.

## Key Principles

- **Docs-only.** Include globs restrict the wired source to documentation files. Source code, build artifacts, and test files are excluded — the wiki tracks _about_ the project, not _the_ project.
- **Snapshot, not symlink.** The sync pull creates point-in-time file copies under `raw/wired/<name>/`. The vault never reads live from the wired repo; it reads from the snapshot.
- **Versioned siblings.** When a doc changes, a new snapshot is created alongside the old one (filename: `<stem>--<date>-<sha8>`). The original snapshot is never overwritten — raw is immutable.
- **Checksum deduplication.** If the content of a file has not changed (same SHA), no new snapshot is created, avoiding redundant re-ingest.
- **One sync point per wired source.** `settings.json` records the last synced commit SHA. `sync-source.sh status` diffs `HEAD` against that SHA to identify what has changed.

## Examples

Registering the plugin repo itself as a wired source allows the vault to track how the plugin evolves. When a new ADR is committed to the plugin repo, `sync-source.sh status` reports the change, the sync pull snapshots the new ADR under `raw/wired/claude-wiki-pages-plugin/`, and the subsequent ingest updates or creates the relevant ADR page in `wiki/`.

## Related Concepts

- [[Sync Skill]] — the skill that orchestrates pulling from a wired source
- [[Sync Workflow]] — the eight-step procedure executed during a sync
- [[sync-source.sh]] — the Bash script that reads the wired source and copies snapshots
- [[Ingest Pipeline]] — processes the new snapshots after sync completes
- [[Firewall]] — the broader principle of confining what may enter the vault's raw layer
