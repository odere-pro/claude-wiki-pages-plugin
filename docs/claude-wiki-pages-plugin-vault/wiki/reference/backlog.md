---
title: "Backlog"
type: concept
aliases: ["Backlog", "backlog", "pending sources", "catch-up"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[Automation]]", "[[Glossary]]", "[[Operations Guide]]"]
related: ["[[Heartbeat]]", "[[Maintenance Agent]]", "[[Maintenance Loop]]", "[[Deterministic Engine]]"]
tags: ["concept", "automation", "maintenance"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Backlog

## Definition

The backlog is the set of outstanding maintenance work: raw sources in `raw/` that have no corresponding `_sources/` summary (pending) plus any overdue lint. Reported deterministically by the `engine backlog` command in O(1) using the source manifest.

## Key Principles

- **Two components:** (1) raw sources with no `_sources/` summary (pending ingest); (2) overdue lint (last lint was more than 10 ingests ago or more than 30 days ago).
- **O(1) detection:** the engine reads the source manifest (`wiki/_sources/manifest.md`) rather than re-scanning the log — the manifest tracks processed state and checksum for every raw source.
- **Heartbeat:** at `SessionStart`, `scripts/heartbeat.sh` surfaces a one-line catch-up recommendation when `maintenance.enabled` and a backlog exists. Recommends only, never mutates.
- **Clearing the backlog:** run the catch-up loop — ingest → curator → polish → lint — either manually or via the [[Maintenance Agent]].

## Examples

- 5 new files in `raw/` since last ingest → backlog of 5 pending sources.
- 15 ingests since last lint run → overdue lint in the backlog.
- `heartbeat.sh` output: `NEXT: run /claude-wiki-pages:wiki to process 5 pending source(s) in raw/.`

## Related Concepts

- [[Heartbeat]] — the SessionStart notification about the backlog
- [[Maintenance Agent]] — the autonomous agent that clears the backlog
- [[Maintenance Loop]] — the ingest → curator → polish → lint catch-up pattern
- [[Deterministic Engine]] — `engine backlog` command detects it
