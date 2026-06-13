---
title: "Wired Source"
type: concept
aliases: ["Wired Source", "wired source", "wired repo", "wired source repository"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Sync Skill (SKILL.md)]]", "[[Engine Scripts Layer (CLAUDE.md)]]"]
related: ["[[Sync Skill]]", "[[Sync Workflow]]", "[[sync-source.sh]]", "[[Ingest Pipeline]]", "[[Firewall]]", "[[Git Checkpoint]]", "[[Vault Resolution]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "sync", "wired-source"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Wired Source

## Definition

A wired source is a git work tree — typically the host project — that has been registered in `settings.json` with docs-only include globs. Registration scopes what the sync skill copies: only documentation files (README, `docs/`, ADRs, RFCs) are eligible; source code is never pulled into `raw/`. The wired source is the supply side of the sync relationship: the plugin vault's `raw/wired/<name>/` directory is the demand side, receiving new immutable snapshots whenever the wired source's docs change.

## Key Principles

- **Docs-only.** Include globs restrict the wired source to documentation files. Source code, build artifacts, and test files are excluded — the wiki tracks _about_ the project, not _the_ project.
- **Snapshot, not symlink.** The sync pull creates point-in-time file copies under `raw/wired/<name>/`. The vault never reads live from the wired repo; it reads from the snapshot. This prevents the wiki from depending on a moving target.
- **Versioned siblings.** When a doc changes, a new snapshot is created alongside the old one (filename: `<stem>--<date>-<sha8>`). The original snapshot is never overwritten — raw is immutable.
- **Checksum deduplication.** If the content of a file has not changed (same SHA), no new snapshot is created, avoiding redundant re-ingest.
- **One sync point per wired source.** `settings.json` records the last synced commit SHA. `sync-source.sh status` diffs `HEAD` against that SHA to identify what has changed.

## Registration Mechanics

A wired source is registered by `wire-source.sh add --vault <vault>` (or manually). The registration record in `settings.json` stores:

| Field | Purpose |
|---|---|
| `name` | Short identifier for the wired source (used as the `raw/wired/<name>/` directory name) |
| `path` | Absolute path to the wired git work tree |
| `includeGlobs` | Docs-only whitelist (e.g., `["README.md", "docs/**", "docs/adr/**"]`) |
| `lastSyncedSHA` | The HEAD commit SHA at the time of the last successful pull |

The `scripts/set-vault.sh` family manages registry operations: `add`, `switch`, `remove`, `list`. These are separate from the sync pull — registration is a one-time setup; sync is a repeating operation.

## Lifecycle

1. **Register** — `wire-source.sh add` writes the wired source entry to `settings.json`.
2. **Status check** — `sync-source.sh status` reads the registry, diffs each wired repo's `HEAD` against `lastSyncedSHA`, and reports changed file counts.
3. **Pull** — `sync-source.sh pull` copies each changed file as a new versioned snapshot under `raw/wired/<name>/`, then advances `lastSyncedSHA` to the current `HEAD`.
4. **Supersede** — the [[Sync Skill]] marks any existing ingested source note for the same document as `superseded_by` the new snapshot.
5. **Ingest** — the normal [[Ingest Pipeline]] picks up the new snapshots from `raw/` and updates wiki pages.

## Examples

Registering the plugin repo itself as a wired source allows the vault to track how the plugin evolves. When a new ADR is committed to the plugin repo, `sync-source.sh status` reports the change, the sync pull snapshots the new ADR under `raw/wired/claude-wiki-pages-plugin/`, and the subsequent ingest updates or creates the relevant ADR page in `wiki/`.

The current vault's `raw/repo/` contents were ingested as a docs-only snapshot of the plugin repository — the wired source pattern in practice.

## Related Concepts

- [[Sync Skill]] — the skill that orchestrates pulling from a wired source
- [[Sync Workflow]] — the eight-step procedure executed during a sync
- [[sync-source.sh]] — the Bash script that reads the wired source and copies snapshots
- [[Ingest Pipeline]] — processes the new snapshots after sync completes
- [[Firewall]] — the enforcement layer that confines what may be written to the vault
- [[Git Checkpoint]] — the snapshot.sh calls that bracket sync operations
