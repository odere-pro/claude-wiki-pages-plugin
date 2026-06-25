---
title: "ADR-0024: Host Project Intake"
type: entity
entity_type: standard
aliases: ["ADR-0024", "adr-0024", "host project intake ADR", "wire-source"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0024|ADR-0024: Host Project Intake]]"]
related: []
tags: ["docs", "adrs", "ingest", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0024: Host Project Intake

Defines the `wire-source.sh add` mechanism that pulls an immutable, docs-only snapshot of the host project into `raw/wired/<name>/`, making the host's own documentation ingestable without manual file copying.

## Overview

ADR-0024 solves the bootstrapping problem: the plugin is installed in a project, but that project's own documentation (README, `docs/`, ADRs) is not automatically in the vault's `raw/`. The wire mechanism stages it once, idempotently, without touching source code.

## Key Facts

**Status:** Accepted

**Wire mechanism:** `bash wire-source.sh add --vault <vault>` registers the host project as a docs-only wired source and snapshots its docs into `raw/wired/<name>/`. The command is idempotent — re-running only picks up changed or new docs.

**Docs-only constraint:** Only README, `docs/`, and ADR/RFC files are included. Source code is never staged.

**Engine integration:** The engine's `backlog --json` enumerates `raw/` recursively. Wired sources under `raw/wired/<name>/` are picked up automatically without special handling.

**Trigger:** The orchestrator calls `wire-source.sh add` before the normal backlog enumeration when the payload carries `wire_project: true`. If the host is not a git work tree, `wire-source.sh` exits non-zero; the orchestrator reports the skip and proceeds with whatever is already in `raw/`.

**Consequences:**
- The host project's docs become wiki-first-class citizens with the same ingest pipeline as any raw source.
- The wired snapshot is immutable — the host's source code cannot be written or modified through the vault.
- Re-wiring on docs change is idempotent.

## Related

The `engine.sh backlog --json` recursive enumeration is defined in ADR-0026 (parallel-extract). The raw-immutability rule (ADR-0005 context) ensures wired snapshots are never modified after staging.
