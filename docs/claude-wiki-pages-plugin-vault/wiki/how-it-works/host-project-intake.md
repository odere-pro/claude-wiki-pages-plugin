---
title: "Host-Project Intake"
type: concept
aliases: ["Host-Project Intake", "host project intake", "project intake", "generate a vault for the project", "ingest the whole repo"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/adr-0024-host-project-intake|ADR-0024: Host-Project Intake]]"]
related: ["[[wired-source|Wired Source]]", "[[Backlog]]", "[[sync-workflow|Sync Workflow]]"]
contradicts: []
supersedes: []
depends_on: ["[[wired-source|Wired Source]]"]
tags: ["concept", "intake", "ingest", "host-project"]
created: 2026-06-15
updated: 2026-06-15
update_count: 1
status: active
confidence: 1.0
---

# Host-Project Intake

## Definition

Host-project intake is the first-class workflow that ingests a project's own documentation into its wiki vault. It answers the intent "generate a vault for the project" — where the host repo's docs become wiki pages without the user manually curating sources. Intake is offered, not forced: the user explicitly chooses it during onboarding or triggers it through a recognized orchestrator intent.

## Key Principles

- **Docs-only, never code.** Intake reuses `wire-source.sh`'s existing include/exclude globs: README, `docs/`, ADRs/RFCs are included; source code, `node_modules`, `dist`, `.git` are excluded.
- **Offered, not auto-triggered.** A large repo would create many pages and commits with no chance to decline. Intake is always a conscious choice.
- **Recursive enumeration via `backlog --json`.** The ingest agent reads `.pendingRaw[]` from `engine.sh backlog --json` — already recursive, `assets/`-excluded, log/manifest-deduped. The bash fallback is a recursive `find`, never a top-level glob.
- **Bounded by the 25-source cap.** If more than 25 sources are pending, the remainder is reported as backlog and ingested on the next run.

## Entry Points

### First-Run Onboarding

When the host is a git work tree, the onboarding/init path presents an explicit choice:
1. Ingest the whole project's docs (wire docs-only → ingest)
2. Start with the bundled sample

This is what "generate a vault for the project" means.

### Existing Vault

The orchestrator gains one **project-intake intent** row: a bounded keyword match on the user's prompt. On match, it dispatches the ingest agent with `wire_project: true`. The agent's Step 1.0 runs `wire-source.sh add` (idempotent), then proceeds through the normal ingest pipeline.

## Mechanism

```
User prompt "generate a vault for the project"
  → Orchestrator: matches project-intake intent
  → Dispatches Ingest Agent with wire_project: true
  → Agent Step 1.0: wire-source.sh add (idempotent)
  → Agent reads backlog --json for .pendingRaw[]
  → Normal 13-step ingest pipeline runs
  → Remainder reported as backlog
```

## Contrast with Manual Ingest

Manual ingest requires the user to copy or wire individual source files into `raw/` themselves. Host-project intake automates the wiring step, making "raw/ ← project docs" a one-command operation rather than a manual staging workflow.

## Related Concepts

- [[wired-source|Wired Source]] — the registered git work tree that supplies docs
- Ingest Pipeline — the 13-step processing that turns raw/ files into wiki pages
- [[Backlog]] — the list of pending raw/ sources the engine tracks
- Ingest Agent — the specialist that executes intake, including the recursive enumeration fix
