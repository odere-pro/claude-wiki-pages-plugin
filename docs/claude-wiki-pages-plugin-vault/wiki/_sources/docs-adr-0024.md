---
title: "ADR-0024: Host Project Intake"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-14
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0024: Host Project Intake

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-14
- **URL:** —

## Summary

ADR-0024 defines the `wire-source.sh add` mechanism for staging the host project's documentation into the vault's `raw/wired/<name>/` directory. It is docs-only (README, `docs/`, ADRs/RFCs — never source code) and idempotent: re-running picks up only changed/new docs. The ingest pipeline's backlog enumeration picks up wired sources automatically via recursive `find`.

## Key Claims

Status: Accepted. `wire-source.sh add --vault <vault>` registers the project as a docs-only wired source and pulls an immutable snapshot into `raw/wired/<name>/`. The snapshot is recursive and excludes `raw/assets/`. The engine's backlog command (`engine.sh backlog --json`) enumerates `raw/` recursively, so wired sources are included without special handling. The `wire_project: true` payload flag tells the orchestrator to run `wire-source.sh add` before the normal backlog enumeration.

Covers: Host Project Intake, Wire Source, Docs-Only Wired Source, wire-source.sh
