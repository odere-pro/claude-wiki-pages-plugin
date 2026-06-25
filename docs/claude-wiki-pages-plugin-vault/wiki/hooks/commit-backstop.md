---
title: "Commit Backstop"
type: concept
aliases: ["Commit Backstop", "subagent-commit-gate", "commit gate"]
parent: "[[hooks|Hooks]]"
path: "hooks"
sources: ["[[hooks-json|hooks.json]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["hooks", "git", "safety", "subagent"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Commit Backstop

The SubagentStop safety net that commits any vault changes left uncommitted when a write-path agent returns, ensuring no LLM write escapes git coverage.

## Definition

The commit backstop is the `subagent-commit-gate.sh` script bound to the `SubagentStop` hook event. It runs after every write-path agent (ingest, curator, polish, maintenance) returns. Its purpose is to sweep up any vault writes that did not land in a `snapshot:` commit — for example, when an agent is interrupted or fails to reach its own `snapshot.sh post` call.

The backstop is pathspec-scoped to the vault, honors `gitCheckpoint.mode=off`, and always exits 0 (non-blocking). It runs last among the SubagentStop scripts so that the lint and tree-conformance gates (which may also run at SubagentStop) report before the commit.

## Key Principles

- **Non-blocking.** `subagent-commit-gate.sh` always exits 0. Its role is to ensure git coverage, not to block the run. A commit failure is logged but does not fail the hook chain.
- **Pathspec-scoped.** The commit only touches files under the vault path; it does not touch the plugin source tree or any other directory.
- **Last to run.** The SubagentStop hook order is: `subagent-lint-gate.sh` → `subagent-ingest-gate.sh` → `subagent-tree-gate.sh` → `subagent-commit-gate.sh`. Gates report first; the backstop commits after.
- **No duplication of snapshot work.** Each write-path specialist already calls `snapshot.sh post` at the end of its write phase. The backstop handles only the gap — dirty state left behind by a partial or interrupted run.
- **gitCheckpoint.mode=off.** When the user has opted out of git checkpointing, the backstop is a no-op. The mode flag is the single knob for this behavior.

## Examples

The ingest agent writes 12 pages and then fails during `snapshot.sh post` (e.g., a git lock conflict). At SubagentStop, `subagent-commit-gate.sh` detects uncommitted vault changes and creates a `snapshot:` commit covering those 12 pages, preserving the work done so far.

## Related Concepts

The commit backstop is the fallback for `snapshot.sh post`. The SubagentStop lint gate (`subagent-lint-gate.sh`) and ingest gate (`subagent-ingest-gate.sh`) are the peer hooks that run before it in the same SubagentStop event.
