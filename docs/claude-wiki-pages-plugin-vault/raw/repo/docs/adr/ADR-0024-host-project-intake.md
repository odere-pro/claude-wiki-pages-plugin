# ADR-0024: Host-project intake — recursive raw enumeration + a first-class "ingest the whole repo" flow

- **Status:** Accepted
- **Date:** 2026-06-13
- **Builds on:** PR #23 (wired sources — `scripts/wire-source.sh`, `sync-source.sh`), [ADR-0016](./ADR-0016-simultaneous-multi-vault-management.md) (per-vault confinement)
- **Anchor:** §5 (Layer 3 — Agents, the orchestrator/ingest specialists), §6 (Data layer — `raw/`)

## Context

A user asked the plugin to "generate a vault for the project," expecting the
repo's documents to become wiki pages. It scaffolded an empty vault (plus one
bundled `sample-source.md`) and stopped. Investigation found two gaps:

1. **A latent enumeration bug.** `scripts/wire-source.sh` stages a project's
   docs-only files as immutable snapshots **nested** at `raw/wired/<name>/<relpath>`.
   The engine already enumerates `raw/` recursively (`src/core/manifest.ts`
   `listRawFiles`, used by `backlog`; `session-start.sh`/`heartbeat.sh` use
   recursive `find`), so the orchestrator's `raw_pending` probe *counts* the
   nested docs and routes to ingest. But the **ingest agent itself** enumerated
   `Glob vault/raw/*.md` — top-level only — so it found nothing nested and
   ingested zero. The one agent that actually writes pages was the broken link.
   `scripts/resolve-vault.sh` (`vault_list --status`) had the same `-maxdepth 1`
   staleness in its cosmetic raw count.

2. **No first-class "ingest the whole repo" flow.** The `init` skill had an
   optional, easily-missed "wire the project" sub-step, but the onboarding
   agent's narrative only mentioned the bundled sample, and there was no way to
   express the intake intent on an already-existing vault.

## Decision

### 1. One recursive source of truth for "what is pending"

The ingest agent stops re-globbing `raw/` and instead reads pending sources
from `engine.sh backlog --json` (`.pendingRaw[]`) — already recursive,
`assets/`-excluded, and log/manifest-deduped. The documented Bun-absent
fallback is a recursive `find` (never a top-level glob). `resolve-vault.sh`'s
status count drops `-maxdepth 1`. The engine's `listRawFiles` is unchanged —
it was already correct; this aligns the bash/agent surfaces to it.

### 2. Project intake is a first-class, offered choice

- **First run.** When the host is a git work tree, the onboarding/init path
  presents an explicit choice: *ingest the whole project's docs* (wire docs-only
  → ingest) vs *start with the bundled sample*. This is what "generate a vault
  for the project" means.
- **Existing vault.** The orchestrator gains one **project-intake intent** row
  (a bounded keyword match — the same kind of prompt read its analytical-verb
  row already uses, so this is not a new contract class). On match it dispatches
  the ingest agent with `wire_project: true`; the agent's Step 1.0 runs
  `wire-source.sh add` (idempotent), then ingests. The orchestrator still never
  writes — the wiring happens inside the specialist, under its git checkpoint.

### 3. Docs-only, never code

Intake reuses `wire-source.sh`'s existing include/exclude globs (README, `docs/`,
ADRs/RFCs; never source code, `node_modules`, `dist`, `.git`). No new staging
mechanism is introduced.

## Alternatives considered

- **Auto-ingest the whole repo with no prompt.** Rejected: a large repo would
  create many pages/commits with no chance to decline. Intake is offered, not
  forced.
- **Teach the orchestrator full NLP intent classification.** Rejected: a
  bounded keyword match is enough and keeps the agent deterministic and cheap.
- **Only fix the glob, skip the flow.** Rejected: that fixes the manual path but
  still leaves "generate a vault for the project" doing nothing useful.

## Consequences

- Wired/nested sources actually ingest end-to-end; the wired-source feature is
  no longer a dead end.
- "Generate a vault for the project" does what users expect, on both fresh and
  existing vaults.
- The ingest agent depends on `engine.sh backlog` for enumeration; the
  recursive `find` fallback preserves the Bun-absent path.
- Intake is bounded by the ingest agent's existing 25-sources-per-run cap, which
  reports the remainder as backlog.

## Revisit when

- A non-git project needs intake (today wiring requires a git work tree), or
- intake should support non-markdown docs (PDF intake is already covered by the
  source-format path; broaden the wire globs deliberately if needed).
