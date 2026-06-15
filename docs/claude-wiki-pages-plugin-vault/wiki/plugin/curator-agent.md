---
title: "Curator Agent"
type: entity
entity_type: tool
aliases: ["Curator Agent", "curator agent", "claude-wiki-pages-curator-agent", "curator"]
parent: "[[plugin|claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[_sources/architecture|Architecture Documentation]]", "[[_sources/adr-0002-agent-naming-convention|ADR-0002: Agent Naming Convention]]", "[[llm-wiki-04-review-validate-fix|User Guide 04: Review Validate Fix]]", "[[_sources/operations|Operations Guide]]", "[[plugin-curator-agent|Curator Agent Source]]"]
related: ["[[orchestrator-agent|Orchestrator Agent]]", "[[polish-agent|Polish Agent]]", "[[ingest-agent|Ingest Agent]]", "[[git-checkpoint|Git Checkpoint]]"]
tags: ["agent", "curator"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# Curator Agent

> [!summary]
> The `claude-wiki-pages-curator-agent` audits the wiki for structural and provenance drift, then auto-heals mechanical issues without user approval. Judgment fixes — folder restructures, page merges, title-collision renames — apply automatically under the git checkpoint. The engine's deterministic `heal` verb runs first; then the agent's judgment pass. Safety is git: every change is reversible with `git revert`.

## Key Facts

- Type: tool (Layer 3 agent, `user-invocable: true` via `/claude-wiki-pages:claude-wiki-pages-curator-agent`)
- Agent name: `claude-wiki-pages-curator-agent` (renamed from `llm-wiki-lint-fix` in version 0.2.0, ADR-0002)
- Dispatched by: [[orchestrator-agent|Orchestrator Agent]] when a previous ingest was not followed by a lint pass, or directly by the user
- Execution sequence: 4 phases — Engine Heal (deterministic), Diagnose, Auto-Heals, Judgment Fixes, then Snapshot and Report
- Retry cap: at most 2 lint-fix sub-agent runs per pipeline (initial run + one re-run)
- Never forges provenance: does not auto-edit `sources:` for orphan pages; never deletes orphan pages; never modifies `raw/`
- Every change is wrapped in a git checkpoint commit for full reversibility

## Overview

The `claude-wiki-pages-curator-agent` is Layer 3's audit-and-repair specialist. It is dispatched by the [[orchestrator-agent|Orchestrator Agent]] when a previous ingest was not followed by a lint pass, or when the user invokes it directly for an audit-and-repair run. It was renamed from `llm-wiki-lint-fix` to `claude-wiki-pages-curator-agent` in version 0.2.0 (ADR-0002) — the new name reflects that the agent does more than lint and fix: it curates structural quality.

## Input and Dispatch

The orchestrator dispatches the curator when:

- A previous ingest entry in `wiki/log.md` is not followed by a lint entry.
- The user explicitly requests an audit (`/claude-wiki-pages:claude-wiki-pages-curator-agent`).
- The [[maintenance-agent|Maintenance Agent]] triggers a catch-up loop and the curator is one of its steps.

The agent receives the vault path and the orchestrator's state probe. It begins by running `engine.sh heal --json` to create a git checkpoint and resolve the structural-error subset deterministically.

## Execution Sequence

### Phase 0 — Engine Heal (deterministic)

Before any judgment-based work, the agent runs:

```bash
bash scripts/engine.sh heal --json
```

The engine creates a `heal:` checkpoint commit, then loops verify → fix → re-verify until structural errors are cleared:

- Index duplicates
- Missing folder notes
- Children drift in folder notes

If `clean: true` is returned, structural errors are resolved and only judgment items remain. If `unresolved` is non-empty, those items require the curator's judgment pass.

### Phase 1 — Diagnose

The agent collects every issue before changing anything, grouping them by severity:

- **Errors:** broken wikilinks, missing required frontmatter, title collisions, index listing non-existent pages.
- **Warnings:** orphan pages, plain-string sources, missing `parent`/`path`, index drift, flat folder sprawl (>12 children), legacy `_index.md` filenames.
- **Info:** body text mentioning a concept without a wikilink, stale confidence, ghost wikilinks in `log.md`.

### Phase 2 — Auto-Heals (no approval needed)

Nine safe, idempotent, content-preserving fixes apply automatically under the checkpoint:

1. Wrap plain-string `sources:` values in wikilinks.
2. Fill missing `parent:` and `path:` frontmatter.
3. Add `title` to `aliases` where missing.
4. Repair folder-note `children` drift.
5. Repair `wiki/index.md` against actual contents.
6. Clean ghost wikilinks in `log.md` (replace with backtick code format).
7. Resolve broken wikilinks via alias/unique-fuzzy matching.
8. Connect orphan pages (link-only — never auto-edit `sources:` for `type: source` orphans, which would forge provenance).
9. Add missing graph color groups.

### Phase 3 — Judgment Fixes (automatic under checkpoint)

Judgment fixes apply automatically — no approval prompt — because the preflight checkpoint makes every change reversible with `git revert <healCommit>`:

- **Restructure flat folders** with more than 12 children into subtopic groups.
- **Resolve title collisions** by renaming the less-canonical page.
- **Densify body wikilinks** where body text mentions a concept that has a page.
- **Merge near-duplicate pages** (>50% content overlap, identified by the agent).

For renames and moves, the agent tries `obsidian-rename.sh` first (Obsidian updates all backlinks automatically); falls back to `git mv` plus manual backlink rewriting if the CLI is unavailable.

### Phase 4 — Snapshot and Report

After judgment fixes, the agent runs:

```bash
bash scripts/snapshot.sh post --target <vault> --label "curator judgment fixes"
```

This creates a `snapshot:` commit for the judgment-fix pass, separate from the engine's `heal:` commit. Items that need editorial intent (deletions, ambiguous merges, broken wikilinks with no fuzzy match) are surfaced as Report items for the user.

## Retry Cap

The agent enforces a cap of at most two lint-fix sub-agent runs per pipeline (initial run + one re-run). This prevents infinite loops on structurally broken vaults.

## Invariants the Agent Enforces

- **Never forge provenance.** The agent does not auto-edit `sources:` to link source orphans — those require human editorial judgment.
- **Never delete orphan pages.** Orphans are connected (linked), not removed.
- **Never modify `raw/`.** Source files are immutable; only `wiki/` is touched.
- **Read before writing.** The agent reads every file fully before editing.
- **Git checkpoint precedes every change.** Rollback is always available.

## Direct Invocation

```
/claude-wiki-pages:claude-wiki-pages-curator-agent
```

Use for an audit-and-repair pass without an ingest beforehand — for example, after manually adding wikilinks or restructuring a folder by hand.

## Related

- [[orchestrator-agent|Orchestrator Agent]] — dispatches to this agent after ingest or when lint is overdue
- [[polish-agent|Polish Agent]] — runs as the tail step after curator completes
- Deterministic Engine — the `engine.sh heal` command the curator runs first
- Lint Rules — the full set of checks the curator performs
- Auto-Heal — the mechanical fixes applied automatically in Phase 2
- [[git-checkpoint|Git Checkpoint]] — every change lands in a reversible commit
