---
title: "Wired Source"
type: concept
aliases: ["wired source", "wired-source", "wire-source.sh", "project intake", "wired project"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "ingest", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Wired Source

A git work tree registered as a docs-only ingest source via `scripts/wire-source.sh`, whose changed documentation files are snapshotted into `raw/wired/<name>/` on each `sync` run for normal ingest processing.

## Definition

A wired source is a git repository (typically the host project) that has been registered with the plugin as a documentation-only ingest source. The registration records include/exclude globs (which doc paths to capture), the `lastSyncedCommit` SHA, and the source name. The record lives in `.claude/claude-wiki-pages/settings.json`.

On each `sync` run (or `wire-source.sh add` with `--apply`), the plugin:
1. Reads the wired source's git history since `lastSyncedCommit`.
2. Identifies changed/new documentation files matching the include globs (README, `docs/`, ADRs/RFCs — never source code).
3. Copies those files as immutable snapshots into `raw/wired/<name>/`.
4. Updates `lastSyncedCommit` to the current HEAD.

The snapshots are then picked up by the engine's `backlog` command (which enumerates `raw/` recursively) and processed by the ingest pipeline as normal sources.

## Key Principles

**Documentation-only — never source code.** The wired-source globs are configured to capture only human-readable documentation (README, `docs/`, ADR/RFC files). Source code files are never captured: they are not knowledge documents and would produce low-quality wiki pages.

**Snapshots are immutable.** Files in `raw/wired/<name>/` are subject to the same immutability guarantee as all other raw content: `protect-raw.sh` and the firewall `denyPaths` block writes. A snapshot is a point-in-time copy; updating it requires a new `sync` run.

**`superseded_by` marks old snapshots.** When a doc file changes between syncs, the new snapshot replaces the old one and the old source note in `wiki/_sources/` gets `status: superseded` and `superseded_by: "[[new-source|New Source]]"`. History is preserved — the old source note is not deleted.

**Idempotent.** Running `wire-source.sh add` on an already-wired source checks for changes since `lastSyncedCommit` and only snapshots new/changed files. Running it with no changes produces no new snapshots.

**Project intake as a first-run choice.** The onboarding flow offers "set up the wiki for this whole repository" as a first-run option. This is the project intake flow: it wires the host project as a docs-only source, takes a snapshot, and then runs the ingest pipeline on the resulting raw files. On subsequent runs, `sync` picks up only changed docs.

**Nested source enumeration is recursive.** Because wired-source snapshots land under `raw/wired/<name>/` (nested), the engine `backlog` command must — and does — enumerate `raw/` recursively. A top-level `Glob raw/*.md` would silently miss every wired snapshot; the engine's recursive enumeration is the single source of truth.

## Examples

A user registers their project repo as a wired source: `wire-source.sh add --vault docs/vault --repo . --name my-project`. The script captures README.md, `docs/**/*.md`, and `docs/adr/**/*.md` as immutable snapshots in `raw/wired/my-project/`. The ingest pipeline processes them into 23 wiki pages. Two weeks later, an ADR is added to the project; `sync` captures the new ADR as `raw/wired/my-project/docs/adr/ADR-0042-new-decision.md` and queues it for ingest.

A wired source for a project's docs with `lastSyncedCommit: abc123` captures only the files changed between commit `abc123` and the current HEAD. If the README changed and three new ADRs were added, four new snapshots appear in `raw/wired/<name>/`.

## Related Concepts

Wired sources are managed by `scripts/wire-source.sh` and tracked in `.claude/claude-wiki-pages/settings.json`. They depend on the raw content immutability guarantee (snapshots are write-protected) and the recursive `engine backlog` enumeration (wired snapshots are nested under `raw/`). The `sync` verb and `superseded_by` frontmatter field handle updates. Project intake is the first-run variant of wired-source registration.
---
