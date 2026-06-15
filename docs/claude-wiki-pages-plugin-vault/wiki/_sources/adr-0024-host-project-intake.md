---
title: "ADR-0024: Host-Project Intake"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-15
tags: ["adr", "intake", "ingest", "wired-source", "host-project"]
aliases: ["ADR-0024: Host-Project Intake", "ADR-0024"]
sources: []
created: 2026-06-15
updated: 2026-06-15
status: active
confidence: 1.0
---

# ADR-0024: Host-Project Intake

## Summary

Fixes a recursive-enumeration gap where the ingest agent used a top-level glob (`raw/*.md`) instead of the engine's existing recursive `backlog --json` surface. Adds a first-class "ingest the whole repo" flow — offered during onboarding and available as an explicit orchestrator intent for existing vaults.

## Key Claims

- The ingest agent now reads pending sources from `engine.sh backlog --json` (`.pendingRaw[]`) — already recursive, `assets/`-excluded, and log/manifest-deduped. The bash fallback is a recursive `find`, never a top-level glob.
- Intake is docs-only: `wire-source.sh`'s existing include/exclude globs cover README, `docs/`, ADRs/RFCs — never source code, `node_modules`, `dist`, `.git`.
- First-run: onboarding presents an explicit choice: ingest the whole project's docs vs. start with the bundled sample.
- Existing vault: the orchestrator gains one project-intake intent row (bounded keyword match); on match it dispatches the ingest agent with `wire_project: true`; the agent's Step 1.0 runs `wire-source.sh add` (idempotent), then ingests.
- Auto-ingest with no prompt was rejected: a large repo would create many pages/commits with no chance to decline. Intake is offered, not forced.
- Intake is bounded by the ingest agent's existing 25-sources-per-run cap, which reports the remainder as backlog.
